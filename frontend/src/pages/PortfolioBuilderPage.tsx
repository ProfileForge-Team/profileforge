import { useState } from 'react';
import { demoSite } from '../api/mockData';
import { useSite, useUpdateSite } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';
import type { PortfolioProject } from '../types/domain';

export function PortfolioBuilderPage() {
  const site = useSite().data ?? demoSite;
  const updateSite = useUpdateSite();
  const showToast = useUiStore((state) => state.showToast);
  const [importing, setImporting] = useState(false);

  const toggleProject = async (id: string) => {
    const projects = site.projects.map((project) => project.id === id ? { ...project, selected: !project.selected } : project);
    try {
      await updateSite.mutateAsync({ siteId: site.id, patch: { projects } });
      showToast('Состав публичной витрины обновлён.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось обновить проект.', 'error');
    }
  };

  const importDemoProject = async () => {
    if (site.projects.some((project) => project.id === 'github-import-demo')) {
      showToast('Демонстрационный импорт уже выполнен.', 'info');
      return;
    }
    setImporting(true);
    const project: PortfolioProject = {
      id: 'github-import-demo', title: 'GitHub Portfolio Import', selected: true,
      description: 'Демонстрационный импорт репозитория: название, описание и технологии добавлены в портфолио.',
      technologies: ['GitHub API', 'React', 'TypeScript'], repositoryUrl: 'https://github.com/'
    };
    try {
      await updateSite.mutateAsync({ siteId: site.id, patch: { projects: [...site.projects, project] } });
      showToast('Проект из GitHub добавлен в демо-режиме.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось импортировать проект.', 'error');
    } finally { setImporting(false); }
  };

  return (
    <section className="page active legacy-page" id="projects">
      <div className="page-inner">
        <div className="section-head reveal visible">
          <div><div className="eyebrow"><span /> PROJECTS</div><h2>Проекты для витрины</h2></div>
          <button type="button" className="primary-btn" onClick={importDemoProject} disabled={importing}>{importing ? 'Импортируем…' : 'Импортировать'}</button>
        </div>
        <div className="wide-banner reveal visible">
          <img src="/assets/project_cards.jpeg" alt="Карточки проектов" />
          <div className="banner-copy"><h3>Каждый проект — как отдельный кейс</h3><p>Короткое описание, технологии и ссылка. Работодатель сразу понимает, что было сделано.</p></div>
        </div>
        <div className="project-grid">
          {site.projects.map((project, index) => (
            <article
              key={project.id}
              className={`project-card reveal visible delay-${Math.min(index, 3)}${project.selected ? ' selected' : ''}`}
              onClick={() => void toggleProject(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void toggleProject(project.id); } }}
            >
              <div className="project-icon">{project.title.slice(0, 1).toUpperCase()}</div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <div className="chips">{project.technologies.slice(0, 4).map((technology) => <span key={technology}>{technology}</span>)}</div>
              <small className="selection-state">{project.selected ? '✓ Показывается на странице' : 'Нажмите, чтобы добавить в витрину'}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
