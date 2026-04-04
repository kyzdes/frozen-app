import { AlertCircle } from 'lucide-react';
import type { AuthScreenProps } from '../lib/types';

export function AuthScreen({ lang, mode, name, email, password, loading, error, onModeChange, onNameChange, onEmailChange, onPasswordChange, onSubmit }: AuthScreenProps) {
  const ru = lang === 'ru';

  return (
    <div className="app-root auth-gate">
      <div className="auth-card">
        <h1>FreezerApp</h1>
        <p>{ru ? 'Войдите в аккаунт, чтобы открыть холодильник' : 'Sign in to access your freezer'}</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => onModeChange('login')}
            type="button"
          >
            {ru ? 'Вход' : 'Login'}
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => onModeChange('register')}
            type="button"
          >
            {ru ? 'Регистрация' : 'Register'}
          </button>
        </div>

        <div className="auth-form">
          {mode === 'register' && (
            <label>
              {ru ? 'Имя' : 'Name'}
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder={ru ? 'Ваше имя' : 'Your name'}
              />
            </label>
          )}

          <label>
            Email
            <input
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
          </label>

          <label>
            {ru ? 'Пароль' : 'Password'}
            <input
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder={ru ? 'Минимум 8 символов' : 'At least 8 characters'}
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </label>

          <button className="pill primary auth-submit" onClick={onSubmit} disabled={loading}>
            {loading
              ? ru ? 'Подождите…' : 'Please wait…'
              : mode === 'register'
                ? ru ? 'Создать аккаунт' : 'Create account'
                : ru ? 'Войти' : 'Sign in'}
          </button>
        </div>

        {error ? (
          <div className="error-banner inline">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
