import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

const schema = z.object({
  email: z.string().email('Введите корректный email.'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов.')
});

type AuthForm = z.infer<typeof schema>;

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showToast = useUiStore((state) => state.showToast);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  const submit = async (values: AuthForm) => {
    try {
      const session = mode === 'login' ? await api.login(values) : await api.register(values);
      setSession(session);
      showToast(mode === 'login'
        ? 'Вход выполнен. Добро пожаловать в ProfileForge.'
        : 'Аккаунт создан. Можно собирать профиль.');
      navigate('/dashboard');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось выполнить действие.', 'error');
    }
  };

  return (
    <section className="page active legacy-page" id="auth">
      <div className="split-layout page-inner">
        <div className="auth-panel glass-card reveal visible">
          <div className="eyebrow"><span /> AUTH ACCESS</div>
          <h2>{mode === 'login' ? 'Вход в ProfileForge' : 'Создание аккаунта'}</h2>
          <form className="form" onSubmit={handleSubmit(submit)}>
            <label>Email
              <input type="email" {...register('email')} />
              {errors.email && <small className="form-error">{errors.email.message}</small>}
            </label>
            <label>Пароль
              <input type="password" {...register('password')} />
              {errors.password && <small className="form-error">{errors.password.message}</small>}
            </label>
            <button type="submit" className="primary-btn wide" disabled={isSubmitting}>
              {isSubmitting ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
            <button type="button" className="ghost-btn wide" onClick={() => setMode((value) => value === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Создать аккаунт' : 'У меня уже есть аккаунт'}
            </button>
          </form>
          <p className="auth-note">Форма подключена к API Gateway. Сессия автоматически обновляется через refresh token.</p>
        </div>
        <div className="image-stage reveal visible delay-1">
          <img src="/assets/login_background.jpeg" alt="Вход в ProfileForge" />
          <div className="scan-line" />
        </div>
      </div>
    </section>
  );
}
