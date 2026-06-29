import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { demoProfile, demoSite } from '../api/mockData';
import { useProfile, usePublicPortfolio, usePublishSite, useSite } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';
import type { PortfolioProject, SiteBlockType, TemplateKey } from '../types/domain';

type ContactLink = {
  label: string;
  value: string;
  href: string;
};

type TemplateView = {
  key: 'clean' | 'developer' | 'minimal' | 'cyber';
  label: string;
  description: string;
  art: string;
};

const templateMeta: Record<string, TemplateView> = {
  clean: { key: 'clean', label: 'DEFAULT', description: 'Универсальное портфолио', art: '/assets/reference_layout.jpeg' },
  default: { key: 'clean', label: 'DEFAULT', description: 'Универсальное портфолио', art: '/assets/reference_layout.jpeg' },
  developer: { key: 'developer', label: 'DARK DEVELOPER', description: 'Технологичное портфолио', art: '/assets/portfolio_background.jpeg' },
  'dark-developer': { key: 'developer', label: 'DARK DEVELOPER', description: 'Технологичное портфолио', art: '/assets/portfolio_background.jpeg' },
  minimal: { key: 'minimal', label: 'MINIMAL RESUME', description: 'Чистое профессиональное резюме', art: '/assets/minimal_resume.jpeg' },
  'minimal-resume': { key: 'minimal', label: 'MINIMAL RESUME', description: 'Чистое профессиональное резюме', art: '/assets/minimal_resume.jpeg' },
  cyber: { key: 'cyber', label: 'CYBER SHOWCASE', description: 'Креативная витрина проектов', art: '/assets/cyber_background.jpeg' },
  'cyber-showcase': { key: 'cyber', label: 'CYBER SHOWCASE', description: 'Креативная витрина проектов', art: '/assets/cyber_background.jpeg' }
};

function normalizeExternalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getLinkLabel(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^mailto:/, '');
}

function getTemplateView(template: TemplateKey): TemplateView {
  return templateMeta[template] ?? templateMeta.clean;
}

function getFrontendOrigin(): string {
  return typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin;
}

function makePublicHandle(value?: string): string | null {
  const handle = (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return handle.length >= 3 ? handle : null;
}

function ProjectList({ projects }: { projects: PortfolioProject[] }) {
  if (!projects.length) {
    return (
      <article className="portfolio-empty">
        <strong>Добавьте проекты</strong>
        <span>Перейдите в раздел «Проекты», чтобы наполнить публичную витрину.</span>
      </article>
    );
  }

  return (
    <div className="portfolio-projects-list">
      {projects.map((project) => {
        const projectUrl = project.repositoryUrl || project.demoUrl;

        return (
          <article
            className={`portfolio-project${projectUrl ? ' clickable' : ''}`}
            key={project.id}
            onClick={() => {
              if (projectUrl) window.open(projectUrl, '_blank', 'noopener,noreferrer');
            }}
            role={projectUrl ? 'link' : undefined}
            tabIndex={projectUrl ? 0 : undefined}
            onKeyDown={(event) => {
              if (!projectUrl) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.open(projectUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <div className="portfolio-project-number">{project.title.slice(0, 1).toUpperCase()}</div>
            <div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="portfolio-tags">
                {project.technologies.slice(0, 5).map((technology) => <span key={technology}>{technology}</span>)}
              </div>
            </div>
            <div className="portfolio-project-links">
              {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>GitHub ↗</a>}
              {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Demo ↗</a>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

type PublicPortfolioPageProps = {
  readOnly?: boolean;
};

export function PublicPortfolioPage({ readOnly = false }: PublicPortfolioPageProps) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const profileQuery = useProfile(!readOnly);
  const siteQuery = useSite(!readOnly);
  const publicPortfolioQuery = usePublicPortfolio(readOnly ? slug : undefined);
  const profile = readOnly
    ? publicPortfolioQuery.data?.profile ?? demoProfile
    : profileQuery.data ?? demoProfile;
  const site = readOnly
    ? publicPortfolioQuery.data?.site ?? demoSite
    : siteQuery.data ?? demoSite;
  const publishSite = usePublishSite();
  const showToast = useUiStore((state) => state.showToast);
  const selectedProjects = useMemo(() => site.projects.filter((project) => project.selected), [site.projects]);
  const template = getTemplateView(site.template);
  const publicHandle = makePublicHandle(profile.username) ?? makePublicHandle(site.slug);
  const publicResumePath = publicHandle ? `/${publicHandle}` : null;
  const publicResumeUrl = publicResumePath ? `${getFrontendOrigin()}${publicResumePath}` : null;

  const blockByType = (type: SiteBlockType) => site.blocks.find((block) => block.type === type);
  const isVisible = (type: SiteBlockType) => blockByType(type)?.isVisible !== false;
  const titleFor = (type: SiteBlockType, fallback: string) => blockByType(type)?.title || fallback;

  const contacts: ContactLink[] = [
    profile.links.email ? { label: 'Email', value: profile.links.email, href: `mailto:${profile.links.email}` } : null,
    profile.links.github ? { label: 'GitHub', value: getLinkLabel(profile.links.github), href: normalizeExternalUrl(profile.links.github) } : null,
    profile.links.telegram ? { label: 'Telegram', value: getLinkLabel(profile.links.telegram), href: normalizeExternalUrl(profile.links.telegram) } : null,
    profile.links.linkedin ? { label: 'LinkedIn', value: getLinkLabel(profile.links.linkedin), href: normalizeExternalUrl(profile.links.linkedin) } : null
  ].filter((contact): contact is ContactLink => Boolean(contact));

  const publish = async () => {
    try {
      await publishSite.mutateAsync(site.id);
      showToast(site.isPublished
        ? 'Публикация обновлена. Локальная публичная страница уже открыта.'
        : 'Страница опубликована. Локальная публичная страница уже открыта.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось опубликовать страницу.', 'error');
    }
  };

  return (
    <section className={`page active legacy-page portfolio-template portfolio-template--${template.key}${readOnly ? ' portfolio-readonly' : ''}`} id="public">
      <div className="page-inner">
        {!readOnly && (
          <div className="public-toolbar reveal visible">
            <span className={`publish-status${site.isPublished ? ' active' : ''}`}>
              {site.isPublished ? '● Страница опубликована' : '○ Черновик страницы'}
            </span>
            <div className="public-toolbar-actions">
              <button type="button" className="ghost-btn compact-button" onClick={() => navigate('/templates')}>Сменить шаблон</button>
              <button type="button" className="ghost-btn compact-button" onClick={publish} disabled={publishSite.isPending}>
                {publishSite.isPending ? 'Публикуем…' : site.isPublished ? 'Обновить публикацию' : 'Опубликовать'}
              </button>
            </div>
          </div>
        )}

        <div className="portfolio-shell reveal visible">
          <header className="portfolio-hero-card">
            <img className="portfolio-hero-art" src={template.art} alt="Фоновая иллюстрация шаблона" />
            <div className="portfolio-hero-shade" />
            <div className="portfolio-template-name">{template.label}</div>
            <div className="portfolio-identity">
              <img className="portfolio-avatar" src={profile.avatarUrl ?? '/assets/avatar_hologram.jpeg'} alt={`Аватар ${profile.displayName || profile.username}`} />
              <div className="portfolio-title-wrap">
                <p className="portfolio-kicker">{template.description}</p>
                <h1>{profile.displayName || profile.username}</h1>
                <p className="portfolio-headline">
                  {profile.headline}
                  {profile.location ? <><span>•</span>{profile.location}</> : null}
                </p>
              </div>
            </div>
            {!readOnly && (
              <div className="portfolio-hero-actions">
                <button type="button" className="portfolio-primary-action" onClick={() => navigate('/projects')}>Открыть проекты</button>
                <button type="button" className="portfolio-secondary-action" onClick={() => navigate('/templates')}>Сменить шаблон</button>
                {site.isPublished && publicResumePath && publicResumeUrl && (
                  <a className="portfolio-secondary-action portfolio-resume-link" href={publicResumePath} target="_blank" rel="noreferrer">
                    {publicResumeUrl.replace(/^https?:\/\//, '')}
                  </a>
                )}
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
                  <div className="portfolio-tags portfolio-skills-tags">
                    {profile.skills.length ? profile.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Добавьте навыки</span>}
                  </div>
                </section>
              )}

              {isVisible('contacts') && (
                <section className="portfolio-section portfolio-contacts">
                  <div className="portfolio-section-title"><span>04</span><h2>{titleFor('contacts', 'Контакты')}</h2></div>
                  <div className="portfolio-contact-list">
                    {contacts.length ? contacts.map((contact) => (
                      <a key={contact.label} href={contact.href} target={contact.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                        <small>{contact.label}</small>
                        <strong>{contact.value}</strong>
                      </a>
                    )) : <span>Контакты пока не заполнены.</span>}
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
