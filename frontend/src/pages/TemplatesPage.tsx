import { useNavigate } from 'react-router-dom';
import { demoSite } from '../api/mockData';
import { useSite, useUpdateSite } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';
import type { TemplateKey } from '../types/domain';

type TemplateOption = {
  key: TemplateKey;
  title: string;
  text: string;
  image: string;
  accent: string;
  tags: string[];
};

const templates: TemplateOption[] = [
  {
    key: 'clean',
    title: 'Default',
    text: 'Универсальное портфолио с чистой структурой и акцентом на содержание.',
    image: 'reference_layout.jpeg',
    accent: 'Универсальный',
    tags: ['Профиль', 'Контакты', 'Проекты']
  },
  {
    key: 'developer',
    title: 'Dark Developer',
    text: 'Контрастная тёмная тема для разработчика и технологичных проектов.',
    image: 'developer_template.jpeg',
    accent: 'IT / Tech',
    tags: ['Неон', 'Стек', 'GitHub']
  },
  {
    key: 'minimal',
    title: 'Minimal Resume',
    text: 'Сдержанное резюме с понятной типографикой и аккуратной подачей опыта.',
    image: 'minimal_resume.jpeg',
    accent: 'Деловой',
    tags: ['Резюме', 'Светлый', 'ATS']
  },
  {
    key: 'cyber',
    title: 'Cyber Showcase',
    text: 'Выразительная витрина для тех, кто хочет сделать проекты главным фокусом.',
    image: 'cyber_background.jpeg',
    accent: 'Креативный',
    tags: ['Cyber', 'Проекты', 'Showcase']
  }
];

export function TemplatesPage() {
  const navigate = useNavigate();
  const site = useSite().data ?? demoSite;
  const updateSite = useUpdateSite();
  const showToast = useUiStore((state) => state.showToast);

  const selectTemplate = async (template: TemplateKey) => {
    try {
      if (site.template !== template) {
        await updateSite.mutateAsync({ siteId: site.id, patch: { template } });
        showToast('Шаблон сохранён. Открываем предпросмотр.');
      }
      navigate('/public');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось выбрать шаблон.', 'error');
    }
  };

  return (
    <section className="page active legacy-page" id="templates">
      <div className="page-inner">
        <div className="section-head reveal visible">
          <div>
            <div className="eyebrow"><span /> ШАБЛОНЫ</div>
            <h2>Оформление страницы</h2>
            <p className="template-intro">Выберите стиль — он сразу применится к публичному портфолио. Содержимое профиля и проектов сохранится.</p>
          </div>
          <button type="button" className="ghost-btn compact-button" onClick={() => navigate('/public')}>Открыть текущий</button>
        </div>

        <div className="template-grid template-grid-working">
          {templates.map((template, index) => {
            const selected = site.template === template.key;
            return (
              <article key={template.key} className={`template-card template-card--${template.key} reveal visible delay-${Math.min(index, 3)}${selected ? ' selected' : ''}`}>
                <div className="template-preview-wrap">
                  <img src={`/assets/${template.image}`} alt={`Превью шаблона ${template.title}`} />
                  <span className="template-accent-label">{template.accent}</span>
                  {selected && <span className="template-selected-badge">✓ Активный шаблон</span>}
                </div>
                <h3>{template.title}</h3>
                <p>{template.text}</p>
                <div className="chips template-tags">{template.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <button
                  type="button"
                  className={`${selected ? 'primary-btn' : 'ghost-btn'} wide template-select-button`}
                  onClick={() => void selectTemplate(template.key)}
                  disabled={updateSite.isPending}
                >
                  {updateSite.isPending ? 'Сохраняем…' : selected ? 'Открыть предпросмотр' : 'Выбрать и открыть'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
