import { useState } from 'react';
import { Icon } from '../lib/icons';
import type { AuthScreenProps } from '../lib/types';

export function AuthScreen({
  lang,
  mode,
  name,
  email,
  password,
  loading,
  error,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: AuthScreenProps) {
  const L = (ru: string, en: string) => (lang === 'ru' ? ru : en);
  const [show, setShow] = useState(false);
  const isRegister = mode === 'register';

  return (
    <div className="w-auth">
      <div className="w-auth-card">
        <div className="w-auth-brand">
          <div className="w-auth-mark">❄️</div>
          <h1>Морозилка</h1>
          <p>{L('Видно с первого взгляда, что скоро испортится', 'See at a glance what’s about to spoil')}</p>
        </div>

        <div className="w-auth-tabs">
          <button className={!isRegister ? 'on' : ''} onClick={() => onModeChange('login')} type="button">
            {L('Вход', 'Sign in')}
          </button>
          <button className={isRegister ? 'on' : ''} onClick={() => onModeChange('register')} type="button">
            {L('Регистрация', 'Sign up')}
          </button>
        </div>

        <form
          className="w-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {isRegister && (
            <div className="w-field">
              <label>{L('Имя', 'Name')}</label>
              <div className="w-input-ico">
                <Icon name="users" size={18} />
                <input
                  className="w-input"
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder={L('Ваше имя', 'Your name')}
                />
              </div>
            </div>
          )}

          <div className="w-field">
            <label>{L('Эл. почта', 'Email')}</label>
            <div className="w-input-ico">
              <Icon name="mail" size={18} />
              <input
                className="w-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="w-field">
            <label>{L('Пароль', 'Password')}</label>
            <div className="w-input-ico">
              <Icon name="lock" size={18} />
              <input
                className="w-input"
                type={show ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder={L('Минимум 8 символов', 'At least 8 characters')}
              />
              <span className="eye" onClick={() => setShow((s) => !s)} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 14, cursor: 'pointer', color: 'var(--fg3)' }}>
                <Icon name="eye" size={18} />
              </span>
            </div>
          </div>

          <button className="w-btn primary full" type="submit" disabled={loading}>
            {loading ? L('Подождите…', 'Please wait…') : isRegister ? L('Создать аккаунт', 'Create account') : L('Войти', 'Sign in')}
            {!loading && <Icon name="arrowR" size={17} />}
          </button>
        </form>

        {error ? (
          <div className="w-auth-error">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <p className="w-auth-foot">
          {isRegister ? L('Уже есть аккаунт?', 'Have an account?') : L('Нет аккаунта?', 'No account?')}{' '}
          <button type="button" onClick={() => onModeChange(isRegister ? 'login' : 'register')}>
            {isRegister ? L('Войти', 'Sign in') : L('Создать', 'Sign up')}
          </button>
        </p>
      </div>
    </div>
  );
}
