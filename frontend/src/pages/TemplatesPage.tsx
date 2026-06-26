import { demoSite } from '../api/mockData';
import { useSite, useUpdateSite } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';
import type { TemplateKey } from '../types/domain';

const templates: Array<{ key: TemplateKey; title: string; text: string; image: string }> = [
  { key: 'developer', title: 'Тёмный разработчик', text: 'Контрастная тема для IT-портфолио.', image: 'developer_template.jpeg' },
  { key: 'minimal', title: 'Минимальное резюме', text: 'Спокойная подача без визуального шума.', image: 'minimal_resume.jpeg' },
  { key: 'cyber', title: 'Кибер-витрина', text: 'Яркий стиль для публичной страницы.', image: 'template_select.jpeg' }
];

export function TemplatesPage() {
  const site = useSite().data ?? demoSite;
  const updateSite = useUpdateSite();
  const showToast = useUiStore((state) => state.showToast);

  const selectTemplate = async (template: TemplateKey) => {
    try {
      await updateSite.mutateAsync({ siteId: site.id, patch: { template } });
      showToast('Шаблон сохранён. Его можно увидеть на публичной странице.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось выбрать шаблон.', 'error');
    }
  };

  return (
    <section className="page active legacy-page" id="templates">
      <div className="page-inner">
        <div className="section-head reveal visible"><div><div className="eyebrow"><span /> ШАБЛОНЫ</div><h2>Оформление страницы</h2></div></div>
        <div className="template-grid">
          {templates.map((template, index) => {
            const selected = site.template === template.key;
            return (
              <article key={template.key} className={`template-card reveal visible delay-${index}${selected ? ' selected' : ''}`}>
                <img src={`/assets/${template.image}`} alt={template.title} />
                <h3>{template.title}</h3><p>{template.text}</p>
                <button type="button" className={`${selected ? 'primary-btn' : 'ghost-btn'} wide`} onClick={() => void selectTemplate(template.key)} disabled={updateSite.isPending}>
                  {selected ? 'Выбран' : 'Выбрать'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
