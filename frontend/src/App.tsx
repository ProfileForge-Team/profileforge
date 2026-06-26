import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthPage } from './pages/AuthPage';
import { CommunityPage } from './pages/CommunityPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { PortfolioBuilderPage } from './pages/PortfolioBuilderPage';
import { ProfileEditorPage } from './pages/ProfileEditorPage';
import { PublicPortfolioPage } from './pages/PublicPortfolioPage';
import { TemplatesPage } from './pages/TemplatesPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/editor" element={<ProfileEditorPage />} />
        <Route path="/projects" element={<PortfolioBuilderPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/public" element={<PublicPortfolioPage />} />
        <Route path="/u/:slug" element={<PublicPortfolioPage />} />
        <Route path="/rating" element={<CommunityPage />} />
        <Route path="/profile" element={<Navigate to="/editor" replace />} />
        <Route path="/portfolio" element={<Navigate to="/projects" replace />} />
        <Route path="/community" element={<Navigate to="/rating" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
