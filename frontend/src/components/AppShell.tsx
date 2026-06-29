import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Toast } from './Toast';

const navigation = [
  { to: '/', label: 'Главная', end: true },
  { to: '/dashboard', label: 'Кабинет' },
  { to: '/editor', label: 'Редактор' },
  { to: '/projects', label: 'Проекты' },
  { to: '/templates', label: 'Шаблоны' },
  { to: '/public', label: 'Публичная' }
];

export function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    const updateGlow = (event: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${event.clientX}px`;
      glowRef.current.style.top = `${event.clientY}px`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('mousemove', updateGlow);
    updateProgress();
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('mousemove', updateGlow);
    };
  }, []);

  const signOut = () => {
    clearSession();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="legacy-app">
      <div className="noise" />
      <div ref={glowRef} className="cursor-glow" />
      <div className="top-progress" style={{ width: `${progress}%` }} />

      <header className="site-header">
        <Link to="/" className="brand" aria-label="ProfileForge — главная">
          <img className="brand-logo brand-logo-full" src="/assets/profileforge_logo_header.jpg" alt="Логотип ProfileForge" />
        </Link>

        <nav className="nav" aria-label="Основная навигация">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <button type="button" className="ghost-btn" onClick={signOut}>Выйти</button>
          ) : (
            <button type="button" className="ghost-btn" onClick={() => navigate('/auth')}>Войти</button>
          )}
          <button type="button" className="primary-btn" onClick={() => navigate('/editor')}>Собрать профиль</button>
        </div>

        <button type="button" className="menu-btn" onClick={() => setMenuOpen((value) => !value)} aria-label="Открыть меню">
          {menuOpen ? '×' : '☰'}
        </button>
      </header>

      <div className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <button type="button" className="ghost-btn mobile-action" onClick={() => { setMenuOpen(false); navigate(user ? '/' : '/auth'); }}>
          {user ? 'Закрыть меню' : 'Войти'}
        </button>
      </div>

      <main>{children}</main>
      <Toast />
    </div>
  );
}
