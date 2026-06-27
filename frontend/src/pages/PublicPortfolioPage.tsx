import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoProfile, demoSite } from '../api/mockData';
import { useProfile, usePublishSite, useSite } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';
import type { PortfolioProject, SiteBlockType, TemplateKey } from '../types/domain';

const templateMeta: Record<TemplateKey, { label: string; description: string; art: string }> = {
  clean: { label: 'DEFAULT', description: 'Универсальное портфолио', art: '/assets/reference_layout.jpeg' },
  developer: { label: 'DARK DEVELOPER', description: 'Технологичное портфолио', art: '/assets/portfolio_background.jpeg' },
  minimal: { label: 'MINIMAL RESUME', description: 'Чистое профессиональное резюме', art: '/assets/minimal_resume.jpeg' },
  cyber: { label: 'CYBER SHOWCASE', description: 'Креативная витрина проектов', art: '/assets/cyber_background.jpeg' }
};

function getLinkLabel(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^mailto:/, '');
}

function ProjectList({ projects }: { projects: PortfolioProject[] }) {
  if (!projects.length) {
    return <article className="portfolio-empty"><strong>Добавьте проекты</strong><span>Перейдите в раздел «Проекты», чтобы наполнить публичную витрину.</span></article>;
  }

  return (
    <div className="portfolio-projects-list">
      {projects.map((project) => (
        <article className="portfolio-project" key={project.id}>
          <div className="portfolio-project-number">{project.title.slice(0, 1).toUpperCase()}</div>
          <div>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <div className="portfolio-tags">{project.technologies.slice(0, 5).map((technology) => <span key={technology}>{technology}</span>)}</div>
          </div>
          <div className="portfolio-project-links">
            {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
            {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer">Demo ↗</a>}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PublicPortfolioPage() {
  const navigate = useNavigate();
  const profile = useProfile().data ?? demoProfile;
  const site = useSite().data ?? demoSite;
  const publishSite = usePublishSite();
  const showToast = useUiStore((state) => state.showToast);
  const [contactOpen, setContactOpen] = useState(false);
  const selectedProjects = useMemo(() => site.projects.filter((project) => project.selected), [site.projects]);
  const template = site.template in templateMeta ? site.template : 'clean';
  const meta = templateMeta[template];

  const isVisible = (type: SiteBlockType) => site.blocks.some((block) => block.type === type && block.isVisible);
  const titleFor = (type: SiteBlockType, fallback: string) => site.blocks.find((block) => block.type === type)?.title || fallback;
  const contactEntries = [
    profile.links.email ? { label: 'Email', href: `mailto:${profile.links.email}`, value: profile.links.email } : null,
    profile.links.github ? { label: 'GitHub', href: profile.links.github, value: getLinkLabel(profile.links.github) } : null,
    profile.links.telegram ? { label: 'Telegram', href: profile.links.telegram, value: getLinkLabel(profile.links.telegram) } : null,
    profile.links.linkedin ? { label: 'LinkedIn', href: profile.links.linkedin, value: getLinkLabel(profile.links.linkedin) } : null
  ].filter(Boolean) as Array<{ label: string; href: string; value: string }>;

  const publish = async () => {
    try {
      await publishSite.mutateAsync(site.id);
      showToast(`Страница опубликована: profileforge.app/${site.slug}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось опубликовать страницу.', 'error');
    }
  };

  return (
    <section className={`page active legacy-page portfolio-template portfolio-template--${template}`} id="public">
      <div className="page-inner">
        <div className="public-toolbar reveal visible">
          <span className={`publish-status${site.isPublished ? ' active' : ''}`}>{site.isPublished ? '● Страница опубликована' : '○ Черновик страницы'}</span>
          <div className="public-toolbar-actions">
            <button type="button" className="ghost-btn compact-button" onClick={() => navigate('/templates')}>Сменить шаблон</button>
            <button type="button" className="ghost-btn compact-button" onClick={publish} disabled={publishSite.isPending || site.isPublished}>
              {site.isPublished ? 'Опубликовано' : publishSite.isPending ? 'Публикуем…' : 'Опубликовать'}
            </button>
          </div>
        </div>

        <div className="portfolio-shell reveal visible">
          <header className="portfolio-hero-card">
            <img className="portfolio-hero-art" src={meta.art} alt="Фоновая иллюстрация шаблона" />
            <div className="portfolio-hero-shade" />
            <div className="portfolio-template-name">{meta.label}</div>
            <div className="portfolio-identity">
              <img className="portfolio-avatar" src={profile.avatarUrl ?? '/assets/avatar_hologram.jpeg'} alt={`Аватар ${profile.displayName}`} />
              <div className="portfolio-title-wrap">
                <p className="portfolio-kicker">{meta.description}</p>
                <h1>{profile.displayName}</h1>
                <p className="portfolio-headline">{profile.headline}{profile.location ? <><span>•</span>{profile.location}</> : null}</p>
              </div>
            </div>
            <div className="portfolio-hero-actions">
              <button type="button" className="portfolio-primary-action" onClick={() => setContactOpen((value) => !value)}>{contactOpen ? 'Скрыть контакты' : 'Связаться'}</button>
              <button type="button" className="portfolio-secondary-action" onClick={() => navigate('/projects')}>Открыть проекты</button>
            </div>
            {contactOpen && (
              <div className="portfolio-contact-popover">
                {contactEntries.length ? contactEntries.slice(0, 3).map((entry) => <a key={entry.label} href={entry.href} target={entry.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{entry.label}: {entry.value}</a>) : 'Контакты пока не заполнены'}
              </div>
            )}
          </header>

          <div className="portfolio-main-grid">
            <div className="portfolio-column">
              {isVisible('about') && (
                <section className="portfolio-section portfolio-about">
                  <div className="portfolio-section-title"><span>01</span><h2>{titleFor('about', 'О себе')}</h2></div>
                  <p>{profile.bio || 'Добавьте описание в редакторе, чтобы рассказать о себе и своих целях.'}</p>
                </section>
              )}

              {isVisible('projects') && (
                <section className="portfolio-section portfolio-projects-section">
                  <div className="portfolio-section-title"><span>02</span><h2>{titleFor('projects', 'Проекты')}</h2></div>
                  <ProjectList projects={selectedProjects} />
                </section>
              )}
            </div>

            <aside className="portfolio-side-column">
              {isVisible('skills') && (
                <section className="portfolio-section portfolio-skills">
                  <div className="portfolio-section-title"><span>03</span><h2>{titleFor('skills', 'Навыки')}</h2></div>
                  <div className="portfolio-tags portfolio-skills-tags">{profile.skills.length ? profile.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Добавьте навыки</span>}</div>
                </section>
              )}

              {isVisible('contacts') && (
                <section className="portfolio-section portfolio-contacts">
                  <div className="portfolio-section-title"><span>04</span><h2>{titleFor('contacts', 'Контакты')}</h2></div>
                  <div className="portfolio-contact-list">
                    {contactEntries.length ? contactEntries.map((entry) => <a key={entry.label} href={entry.href} target={entry.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer"><small>{entry.label}</small><strong>{entry.value}</strong></a>) : <span>Контакты пока не заполнены.</span>}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
