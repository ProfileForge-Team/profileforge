import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { PortfolioBuilderPage } from './pages/PortfolioBuilderPage';
import { ProfileEditorPage } from './pages/ProfileEditorPage';
import { PublicPortfolioPage } from './pages/PublicPortfolioPage';
import { TemplatesPage } from './pages/TemplatesPage';

function ShellPage({ children }: { children: ReactNode }) {
  /** Wraps authenticated-style pages with the shared application shell. */
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  /** Defines all frontend routes, including read-only public resume routes. */
  return (
    <Routes>
      <Route path="/" element={<ShellPage><HomePage /></ShellPage>} />
      <Route path="/auth" element={<ShellPage><AuthPage /></ShellPage>} />
      <Route path="/dashboard" element={<ShellPage><DashboardPage /></ShellPage>} />
      <Route path="/editor" element={<ShellPage><ProfileEditorPage /></ShellPage>} />
      <Route path="/projects" element={<ShellPage><PortfolioBuilderPage /></ShellPage>} />
      <Route path="/templates" element={<ShellPage><TemplatesPage /></ShellPage>} />
      <Route path="/public" element={<ShellPage><PublicPortfolioPage /></ShellPage>} />
      <Route path="/profile" element={<Navigate to="/editor" replace />} />
      <Route path="/portfolio" element={<Navigate to="/projects" replace />} />
      <Route path="/rating" element={<Navigate to="/" replace />} />
      <Route path="/community" element={<Navigate to="/" replace />} />
      <Route path="/public/:slug" element={<PublicPortfolioPage readOnly />} />
      <Route path="/u/:slug" element={<PublicPortfolioPage readOnly />} />
      <Route path="/:slug" element={<PublicPortfolioPage readOnly />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
