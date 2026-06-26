import { useNavigate } from 'react-router-dom';
import { demoProfile, demoSite } from '../api/mockData';
import { useProfile, useSite } from '../hooks/usePortfolio';

export function DashboardPage() {
  const navigate = useNavigate();
  const profile = useProfile().data ?? demoProfile;
  const site = useSite().data ?? demoSite;
  const selectedProjects = site.projects.filter((project) => project.selected).length;
  const readiness = Math.min(100, 45 + (profile.skills.length > 0 ? 12 : 0) + (selectedProjects ? 15 : 0) + (site.template ? 10 : 0) + (site.isPublished ? 18 : 0));

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
              <div className="eyebrow"><span /> ЦЕНТР УПРАВЛЕНИЯ</div>
              <h2>Портфолио почти готово к публикации</h2>
              <p>Осталось выбрать оформление и проверить публичную страницу. Всё главное собрано в одном месте: статус, проекты, ссылка и активность.</p>
              <div className="dash-actions">
                <button type="button" className="primary-btn" onClick={() => navigate('/public')}>Открыть страницу</button>
                <button type="button" className="ghost-btn" onClick={() => navigate('/editor')}>Доработать профиль</button>
              </div>
            </div>
            <div className="dash-orb">
              <div className="orb-ring r1" /><div className="orb-ring r2" />
              <strong>{readiness}%</strong><span>готовность</span>
            </div>
          </div>

          <div className="dash-metrics reveal visible delay-1">
            <div className="metric-tile hot"><span>Просмотры</span><strong>128</strong><small>+18 за неделю</small></div>
            <div className="metric-tile"><span>Переходы</span><strong>24</strong><small>по внешним ссылкам</small></div>
            <div className="metric-tile"><span>Лайки</span><strong>17</strong><small>портфолио в рейтинге</small></div>
          </div>

          <div className="dash-grid">
            <div className="glass-card dash-preview reveal visible">
              <img src="/assets/public_portfolio.jpeg" alt="Предпросмотр портфолио" />
              <div className="preview-fade" />
              <div className="preview-chip">profileforge.app/{site.slug}</div>
            </div>

            <div className="glass-card dash-timeline reveal visible delay-1">
              <h3>Сборка страницы</h3>
              <div className="forge-steps">
                <div className={`step ${profile.displayName ? 'done' : ''}`}><b /><span>Профиль</span><small>{profile.displayName ? 'заполнен' : 'нужно заполнить'}</small></div>
                <div className={`step ${selectedProjects ? 'done' : ''}`}><b /><span>Проекты</span><small>{selectedProjects ? 'выбраны' : 'нужно выбрать'}</small></div>
                <div className={`step ${site.template ? 'active' : ''}`}><b /><span>Шаблон</span><small>{site.template ? 'подтверждён' : 'нужно подтвердить'}</small></div>
                <div className={`step ${site.isPublished ? 'done' : ''}`}><b /><span>Публикация</span><small>{site.isPublished ? 'страница доступна' : 'последний шаг'}</small></div>
              </div>
            </div>

            <div className="glass-card dash-activity reveal visible delay-2">
              <h3>Последние действия</h3>
              <div className="activity-list">
                <span><i /> Добавлены {selectedProjects || 3} проекта</span>
                <span><i /> Обновлены навыки</span>
                <span><i /> Ссылка готова к публикации</span>
              </div>
            </div>

            <div className="glass-card dash-image reveal visible delay-3"><img src="/assets/profile_core.jpeg" alt="Профиль ProfileForge" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
