import { useState } from 'react';
import { useUiStore } from '../stores/uiStore';

const rows = [
  ['04', 'UI/UX-презентация', '731'],
  ['05', 'Backend-профиль', '689'],
  ['06', 'Product-кейсы', '604'],
  ['07', 'Mobile-разработка', '558']
];

export function CommunityPage() {
  const [period, setPeriod] = useState('Неделя');
  const [liked, setLiked] = useState(false);
  const showToast = useUiStore((state) => state.showToast);
  const like = () => {
    setLiked((value) => !value);
    showToast(!liked ? 'Лайк учтён в демо-рейтинге.' : 'Лайк убран из демо-рейтинга.', 'info');
  };

  return (
    <section className="page active legacy-page" id="rating">
      <div className="page-inner rating-page">
        <div className="rating-hero reveal visible">
          <div className="rating-copy">
            <div className="eyebrow"><span /> РЕЙТИНГ ПОРТФОЛИО</div>
            <h2>Лучшие публичные страницы недели</h2>
            <p>Раздел помогает быстро находить сильные портфолио и показывает, какие страницы чаще открывают, сохраняют и лайкают.</p>
            <div className="rating-filters" aria-label="Фильтры рейтинга">
              {['Неделя', 'Месяц', 'Все время'].map((item) => <button key={item} type="button" className={`filter-chip${period === item ? ' active' : ''}`} onClick={() => setPeriod(item)}>{item}</button>)}
            </div>
          </div>
          <div className="rating-art">
            <img src="/assets/community_ranking.jpeg" alt="Рейтинг портфолио" />
            <div className="rating-glow-card top-card"><b>01</b><span>1 248 лайков</span></div>
            <div className="rating-glow-card side-card"><b>+37%</b><span>рост просмотров</span></div>
          </div>
        </div>

        <div className="podium-grid">
          <article className="podium-card second reveal visible delay-1"><div className="place">02</div><h3>Маркетинговое портфолио</h3><p>Кейсы, метрики и визуальные отчёты в одном публичном профиле.</p><div className="score-line"><span style={{ width: '78%' }} /></div><strong>986 лайков</strong></article>
          <article className="podium-card first reveal visible"><div className="crown">◆</div><div className="place">01</div><h3>Frontend-витрина</h3><p>Чистая страница с проектами, стеком, контактами и понятной структурой.</p><div className="score-line"><span style={{ width: '94%' }} /></div><strong>1 248 лайков</strong></article>
          <article className="podium-card third reveal visible delay-2"><div className="place">03</div><h3>Аналитический профиль</h3><p>Портфолио с дашбордами, описанием задач и результатами работы.</p><div className="score-line"><span style={{ width: '66%' }} /></div><strong>842 лайка</strong></article>
        </div>

        <div className="rating-layout">
          <div className="rank-list reveal visible"><div className="rank-list-head"><span>Место</span><span>Портфолио</span><span>Активность</span></div>{rows.map(([place, name, score]) => <div className="rank-row" key={place}><b>{place}</b><span>{name}</span><strong>{score}</strong></div>)}</div>
          <aside className="rating-side reveal visible delay-1">
            <h3>Как считается рейтинг</h3><p>Учитываются лайки, просмотры публичной страницы и переходы по проектам. Так рейтинг показывает не только красоту, но и пользу портфолио.</p>
            <div className="rating-mini-stats"><span><b>42</b> страницы</span><span><b>8.6K</b> просмотров</span><span><b>3.1K</b> лайков</span></div>
            <button type="button" className={`primary-btn${liked ? ' liked' : ''}`} onClick={like}>{liked ? '♥ Лайк поставлен' : '♥ Поднять портфолио'}</button>
          </aside>
        </div>
      </div>
    </section>
  );
}
