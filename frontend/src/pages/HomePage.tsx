import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <section className="page active legacy-page" id="home">
      <div className="hero page-inner">
        <div className="hero-copy reveal visible">
          <div className="eyebrow"><span /> BLACK AQUA FORGE</div>
          <h1>Портфолио, которое работает вместо PDF</h1>
          <p>ProfileForge собирает профиль, проекты и навыки в аккуратную публичную страницу. Без лишней верстки — одна ссылка для работодателя.</p>
          <div className="hero-buttons">
            <button type="button" className="primary-btn" onClick={() => navigate('/editor')}>Создать страницу</button>
            <button type="button" className="ghost-btn" onClick={() => navigate('/public')}>Посмотреть пример</button>
          </div>
          <div className="forge-flow" aria-label="Путь создания портфолио">
            <div className="flow-node active"><b>Профиль</b><span>кто вы</span></div>
            <div className="flow-pulse" />
            <div className="flow-node"><b>Проекты</b><span>что сделали</span></div>
            <div className="flow-pulse delay" />
            <div className="flow-node"><b>Ссылка</b><span>куда отправить</span></div>
          </div>
        </div>

        <div className="hero-visual hero-collage reveal visible delay-1">
          <img className="hero-main-img" src="/assets/digital_forge.jpeg" alt="Интерфейс создания портфолио" />
          <img className="tilt-card tilt-one" src="/assets/project_cards.jpeg" alt="Карточки проектов" />
          <img className="tilt-card tilt-two" src="/assets/skill_system.jpeg" alt="Система навыков" />
          <img className="tilt-card tilt-three" src="/assets/fast_creation.jpeg" alt="Быстрое создание страницы" />
          <div className="aqua-fade" />
          <div className="scan-line" />
          <div className="floating-badge badge-one">Live preview</div>
          <div className="floating-badge badge-two">Profile Core 82%</div>
        </div>
      </div>

      <div className="ticker"><div className="ticker-track">портфолио • проекты • навыки • публичная ссылка • просмотры • шаблоны • контакты • портфолио • проекты • навыки • публичная ссылка</div></div>

      <div className="page-inner grid-3 feature-grid">
        <article className="glass-card reveal visible">
          <img className="card-art" src="/assets/project_import.jpeg" alt="Проекты в один клик" />
          <h3>Проекты в один клик</h3>
          <p>Пользователь выбирает лучшие работы, а сервис оформляет их как понятные карточки.</p>
        </article>
        <article className="glass-card reveal visible delay-1">
          <img className="card-art" src="/assets/skill_system.jpeg" alt="Система навыков" />
          <h3>Навыки без хаоса</h3>
          <p>Технологии группируются в аккуратные блоки: frontend, backend, инструменты.</p>
        </article>
        <article className="glass-card reveal visible delay-2">
          <img className="card-art" src="/assets/fast_creation.jpeg" alt="Быстрое создание" />
          <h3>Ссылка вместо вложения</h3>
          <p>Готовую страницу можно отправить в отклике, резюме или сообщении HR.</p>
        </article>
      </div>
    </section>
  );
}
