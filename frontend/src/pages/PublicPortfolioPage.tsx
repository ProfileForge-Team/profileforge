import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoProfile, demoSite } from '../api/mockData';
import { useProfile, usePublishSite, useSite } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';

export function PublicPortfolioPage() {
  const navigate = useNavigate();
  const profile = useProfile().data ?? demoProfile;
  const site = useSite().data ?? demoSite;
  const publishSite = usePublishSite();
  const showToast = useUiStore((state) => state.showToast);
  const [contactOpen, setContactOpen] = useState(false);
  const selectedProjects = site.projects.filter((project) => project.selected);

  const publish = async () => {
    try {
      await publishSite.mutateAsync(site.id);
      showToast(`Страница опубликована: profileforge.app/${site.slug}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось опубликовать страницу.', 'error');
    }
  };

  return (
    <section className="page active legacy-page" id="public">
      <div className="public-page page-inner">
        <div className="public-toolbar reveal visible">
          <span className={`publish-status${site.isPublished ? ' active' : ''}`}>{site.isPublished ? '● Страница опубликована' : '○ Черновик страницы'}</span>
          <button type="button" className="ghost-btn compact-button" onClick={publish} disabled={publishSite.isPending || site.isPublished}>
            {site.isPublished ? 'Опубликовано' : publishSite.isPending ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </div>

        <div className="public-hero reveal visible">
          <img className="public-bg" src="/assets/portfolio_background.jpeg" alt="Фон публичного портфолио" />
          <div className="public-content">
            <img className="public-avatar" src={profile.avatarUrl ?? '/assets/avatar_hologram.jpeg'} alt={`Аватар ${profile.displayName}`} />
            <h1>{profile.displayName}</h1>
            <p>{profile.headline}{profile.location ? ` • ${profile.location}` : ''}</p>
            <div className="chips center">{profile.skills.slice(0, 6).map((skill) => <span key={skill}>{skill}</span>)}</div>
            <div className="hero-buttons center">
              <button type="button" className="primary-btn" onClick={() => setContactOpen((value) => !value)}>Связаться</button>
              <button type="button" className="ghost-btn" onClick={() => navigate('/projects')}>Открыть проекты</button>
            </div>
            {contactOpen && <div className="public-contact-card">{profile.links.email || 'hello@profileforge.app'}<br />{profile.links.github || 'github.com/'}</div>}
          </div>
          <div className="scan-line" />
        </div>

        <div className="grid-3 feature-grid">
          {selectedProjects.length ? selectedProjects.map((project, index) => (
            <article key={project.id} className={`glass-card reveal visible delay-${Math.min(index, 3)}`}>
              <h3>{project.title}</h3><p>{project.description}</p>
              <div className="chips">{project.technologies.slice(0, 3).map((technology) => <span key={technology}>{technology}</span>)}</div>
            </article>
          )) : <article className="glass-card reveal visible"><h3>Добавьте проекты</h3><p>Перейдите в раздел «Проекты», чтобы наполнить публичную витрину.</p></article>}
        </div>
      </div>
    </section>
  );
}
