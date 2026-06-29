import { useNavigate } from 'react-router-dom';
import { useDashboardSummary, useProfile, useProjects } from '../hooks/usePortfolio';

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
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

export function DashboardPage() {
  const navigate = useNavigate();
  const profileQuery = useProfile();
  const summaryQuery = useDashboardSummary();
  const projectsQuery = useProjects();

  const profile = profileQuery.data;
  const summary = summaryQuery.data;
  const selectedProjectsCount = projectsQuery.data?.filter((project) => project.selected).length;

  const profileDone = Boolean(summary?.profileCompleted);
  const hasSkills = Boolean(profile?.skills.length);
  const projectsCount = selectedProjectsCount ?? summary?.projectsCount ?? 0;
  const blocksCount = summary?.blocksCount ?? 0;
  const hasSite = Boolean(summary?.hasSite);
  const isPublished = Boolean(summary?.sitePublished);
  const readyToPublish = profileDone && hasSkills && projectsCount > 0;
  const publicHandle = makePublicHandle(profile?.username);
  const publicResumePath = isPublished && publicHandle ? `/${publicHandle}` : null;

  const readiness = clampPercent(
    (profileDone ? 35 : 0) +
    (hasSkills ? 20 : 0) +
    (projectsCount > 0 ? 25 : 0) +
    (isPublished ? 20 : 0)
  );

  const title = isPublished
    ? 'Портфолио опубликовано'
    : readyToPublish
      ? 'Портфолио готово к публикации'
      : 'Начните сборку портфолио';

  const description = isPublished
    ? 'Публичная страница доступна. Можно обновлять профиль, проекты и оформление.'
    : readyToPublish
      ? 'Профиль и проекты заполнены. Осталось выбрать оформление и опубликовать страницу.'
      : 'Заполните профиль, добавьте навыки и проекты. Ссылка появится только после публикации.';

  const statusLabel = isPublished ? 'Опубликовано' : hasSite ? 'Черновик' : 'Не начато';
  const statusHint = isPublished ? 'страница доступна' : hasSite ? 'страница еще не опубликована' : 'страница еще не создана';
  const publicLabel = publicResumePath
    ? `${getFrontendOrigin()}${publicResumePath}`.replace(/^https?:\/\//, '')
    : 'Ссылка появится после публикации';

  const profileStepClass = profileDone ? 'done' : 'active';
  const skillsStepClass = hasSkills ? 'done' : profileDone ? 'active' : '';
  const projectsStepClass = projectsCount > 0 ? 'done' : profileDone && hasSkills ? 'active' : '';
  const publishStepClass = isPublished ? 'done' : readyToPublish ? 'active' : '';

  return (
    <section className="page active legacy-page" id="dashboard">
      <div className="dashboard-layout page-inner dashboard-premium">
        <aside className="side-panel glass-card reveal visible dashboard-sidebar">
          <div className="mini-profile">
            <img className="mini-profile-logo" src="/assets/profileforge_logo_icon.jpg" alt="ProfileForge" />
            <div><strong>Forge OS</strong><span>управление портфолио</span></div>
          </div>
          <button type="button" className="side-link active">Обзор</button>
          <button type="button" className="side-link" onClick={() => navigate('/editor')}>Профиль</button>
          <button type="button" className="side-link" onClick={() => navigate('/projects')}>Проекты</button>
          <button type="button" className="side-link" onClick={() => navigate('/templates')}>Оформление</button>
        </aside>

        <div className="dashboard-main dash-studio">
          <div className="dash-hero glass-card reveal visible">
            <div className="dash-copy">
              <div className="eyebrow"><span /> Центр управления</div>
              <h2>{title}</h2>
              <p>{description}</p>
              <div className="dash-actions">
                <button type="button" className="primary-btn" onClick={() => navigate(isPublished ? publicResumePath ?? '/public' : '/editor')}>
                  {isPublished ? 'Открыть страницу' : 'Заполнить профиль'}
                </button>
                <button type="button" className="ghost-btn" onClick={() => navigate('/projects')}>Добавить проекты</button>
              </div>
            </div>
            <div className="dash-orb">
              <div className="orb-ring r1" /><div className="orb-ring r2" />
              <strong>{readiness}%</strong><span>готовность</span>
            </div>
          </div>

          <div className="dash-metrics reveal visible delay-1">
            <div className="metric-tile hot"><span>Проекты</span><strong>{projectsCount}</strong><small>выбрано для страницы</small></div>
            <div className="metric-tile"><span>Блоки</span><strong>{blocksCount}</strong><small>на странице</small></div>
            <div className="metric-tile status-metric"><span>Статус</span><strong>{statusLabel}</strong><small>{statusHint}</small></div>
          </div>

          <div className="dash-grid">
            <div className="glass-card dash-preview reveal visible">
              <img src="/assets/public_portfolio.jpeg" alt="Предпросмотр портфолио" />
              <div className="preview-fade" />
              {publicResumePath ? (
                <button type="button" className="preview-chip preview-chip-link" onClick={() => navigate(publicResumePath)}>{publicLabel}</button>
              ) : (
                <div className="preview-chip">{publicLabel}</div>
              )}
            </div>

            <div className="glass-card dash-timeline reveal visible delay-1">
              <h3>Сборка страницы</h3>
              <div className="forge-steps">
                <div className={`step ${profileStepClass}`}><b /><span>Профиль</span><small>{profileDone ? 'заполнен' : 'нужно заполнить'}</small></div>
                <div className={`step ${skillsStepClass}`}><b /><span>Навыки</span><small>{hasSkills ? 'добавлены' : 'нужно добавить'}</small></div>
                <div className={`step ${projectsStepClass}`}><b /><span>Проекты</span><small>{projectsCount > 0 ? 'добавлены' : 'нужно добавить'}</small></div>
                <div className={`step ${publishStepClass}`}><b /><span>Публикация</span><small>{isPublished ? 'страница доступна' : readyToPublish ? 'можно публиковать' : 'позже'}</small></div>
              </div>
            </div>

            <div className="glass-card dash-activity reveal visible delay-2">
              <h3>Что дальше</h3>
              <div className="activity-list">
                <span><i /> {profileDone ? 'Профиль заполнен' : 'Заполните имя, username и headline'}</span>
                <span><i /> {hasSkills ? 'Навыки добавлены' : 'Добавьте навыки в редакторе профиля'}</span>
                <span><i /> {projectsCount > 0 ? `Проектов: ${projectsCount}` : 'Добавьте первый проект'}</span>
              </div>
            </div>

            <div className="glass-card dash-image reveal visible delay-3"><img src="/assets/profile_core.jpeg" alt="Профиль ProfileForge" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}