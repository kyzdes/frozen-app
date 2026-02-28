import type {
  AnalyticsPayloadDTO,
  AuthResponseDTO,
  AuthTokensDTO,
  CreatePairResponseDTO,
  JoinImportMode,
  JoinPairResponseDTO,
  LeavePairResponseDTO,
  SyncDataDTO,
  SyncResponseDTO,
} from '../domain/contracts';

const TOKENS_STORAGE_KEY = 'freezer-auth-tokens-v1';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class APIClient {
  private readonly baseURL: string;
  private tokens: AuthTokensDTO | null;
  private refreshInFlight: Promise<AuthTokensDTO> | null = null;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';
    this.tokens = this.loadTokens();
  }

  hasSession(): boolean {
    return Boolean(this.tokens?.refresh_token);
  }

  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  async register(name: string, email: string, password: string): Promise<AuthResponseDTO> {
    const response = await this.request<AuthResponseDTO>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    this.setTokens(response.tokens);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponseDTO> {
    const response = await this.request<AuthResponseDTO>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setTokens(response.tokens);
    return response;
  }

  async refresh(): Promise<AuthResponseDTO> {
    const tokens = await this.refreshTokens();
    const me = await this.me();

    return {
      user: me.user,
      pair_context: me.pair_context,
      tokens,
    };
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      }, true);
    } catch {
      // Ignore: session can already be invalid.
    } finally {
      this.clearTokens();
    }
  }

  async me(): Promise<Pick<AuthResponseDTO, 'user' | 'pair_context'>> {
    return this.request<Pick<AuthResponseDTO, 'user' | 'pair_context'>>(
      '/auth/me',
      {
        method: 'GET',
      },
      true
    );
  }

  async createPair(pairName: string): Promise<CreatePairResponseDTO> {
    const response = await this.request<CreatePairResponseDTO>(
      '/pair/create',
      {
        method: 'POST',
        body: JSON.stringify({ pair_name: pairName }),
      },
      true
    );

    this.updateAccessToken(response.access_token || response.token);
    return response;
  }

  async createInviteCode(): Promise<CreatePairResponseDTO> {
    const response = await this.request<CreatePairResponseDTO>(
      '/pair/invite',
      {
        method: 'POST',
      },
      true
    );

    this.updateAccessToken(response.access_token || response.token);
    return response;
  }

  async joinPair(inviteCode: string, importMode: JoinImportMode): Promise<JoinPairResponseDTO> {
    const response = await this.request<JoinPairResponseDTO>(
      '/pair/join',
      {
        method: 'POST',
        body: JSON.stringify({
          invite_code: inviteCode,
          import_mode: importMode,
        }),
      },
      true
    );

    this.updateAccessToken(response.access_token || response.token);
    return response;
  }

  async leavePair(): Promise<LeavePairResponseDTO> {
    const response = await this.request<LeavePairResponseDTO>(
      '/pair/leave',
      {
        method: 'POST',
      },
      true
    );

    this.updateAccessToken(response.access_token || response.token);
    return response;
  }

  async sync(lastKnownVersion: number, changes: SyncDataDTO): Promise<SyncResponseDTO> {
    return this.request<SyncResponseDTO>(
      '/sync',
      {
        method: 'POST',
        body: JSON.stringify({
          last_known_version: lastKnownVersion,
          changes,
        }),
      },
      true
    );
  }

  async sendAnalyticsEvent(payload: AnalyticsPayloadDTO): Promise<void> {
    try {
      await this.request('/analytics', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, false);
    } catch {
      // Analytics should never break UX.
    }
  }

  private async request<T = void>(
    path: string,
    options: {
      method: 'GET' | 'POST';
      body?: string;
    },
    requiresAuth = false,
    allowRetry = true
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(requiresAuth && this.tokens?.access_token
          ? { Authorization: `Bearer ${this.tokens.access_token}` }
          : {}),
      },
      body: options.body,
    });

    if (response.status === 401 && requiresAuth) {
      if (!allowRetry) {
        this.clearTokens();
        throw new UnauthorizedError();
      }

      await this.refreshTokens();
      return this.request<T>(path, options, requiresAuth, false);
    }

    if (response.status >= 400) {
      const message = await this.extractError(response);
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.headers.get('content-type')?.includes('application/json')) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async refreshTokens(): Promise<AuthTokensDTO> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const currentRefresh = this.tokens?.refresh_token;
    if (!currentRefresh) {
      this.clearTokens();
      throw new UnauthorizedError();
    }

    this.refreshInFlight = (async () => {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: currentRefresh }),
      });

      if (response.status === 401) {
        this.clearTokens();
        throw new UnauthorizedError();
      }

      if (response.status >= 400) {
        const message = await this.extractError(response);
        throw new Error(message);
      }

      const parsed = (await response.json()) as AuthResponseDTO;
      this.setTokens(parsed.tokens);
      return parsed.tokens;
    })();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private updateAccessToken(accessToken?: string): void {
    if (!accessToken || !this.tokens) {
      return;
    }

    this.setTokens({
      ...this.tokens,
      access_token: accessToken,
    });
  }

  private setTokens(tokens: AuthTokensDTO): void {
    this.tokens = tokens;
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  }

  clearTokens(): void {
    this.tokens = null;
    localStorage.removeItem(TOKENS_STORAGE_KEY);
  }

  private loadTokens(): AuthTokensDTO | null {
    try {
      const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as AuthTokensDTO;
      if (!parsed?.access_token || !parsed?.refresh_token) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async extractError(response: Response): Promise<string> {
    try {
      const parsed = (await response.json()) as { error?: string; message?: string };
      return parsed.message || parsed.error || `Request failed: HTTP ${response.status}`;
    } catch {
      return `Request failed: HTTP ${response.status}`;
    }
  }
}

export const apiClient = new APIClient();
