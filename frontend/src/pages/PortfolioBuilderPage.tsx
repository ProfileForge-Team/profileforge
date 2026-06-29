import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { demoSite } from '../api/mockData';
import { portfolioKeys, useCreateProject, useProfile, useProjects, useToggleProjectSelection } from '../hooks/usePortfolio';
import { useUiStore } from '../stores/uiStore';
import type { PortfolioProject } from '../types/domain';

type GitHubRepository = {
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  updated_at: string;
};

function githubUsernameFromUrl(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  const match = trimmed.match(/github\.com\/([^/?#]+)/i);
  if (match?.[1]) return match[1];

  if (/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(trimmed)) return trimmed;

  return null;
}

function repoTechnologies(repo: GitHubRepository): string[] {
  return [
    repo.language,
    ...(repo.topics ?? [])
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 5);
}

async function fetchGitHubRepositories(username: string): Promise<GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`);

    if (!response.ok) {
      if (repositories.length > 0) break;
      throw new Error(response.status === 404 ? 'GitHub профиль не найден.' : 'Не удалось загрузить репозитории GitHub.');
    }

    const pageRepositories = await response.json() as GitHubRepository[];
    repositories.push(...pageRepositories);

    if (pageRepositories.length < 100) break;
  }

  return repositories
    .filter((repo) => !repo.fork && !repo.archived)
    .sort((first, second) => new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime());
}

function repoToProject(repo: GitHubRepository): Partial<PortfolioProject> {
  return {
    title: repo.full_name,
    description: repo.description || `GitHub repository ${repo.full_name}.`,
    technologies: repoTechnologies(repo),
    repositoryUrl: repo.html_url,
    demoUrl: repo.homepage || undefined,
    selected: false
  };
}

export function PortfolioBuilderPage() {
  const queryClient = useQueryClient();
  const projects = useProjects().data ?? demoSite.projects;
  const profile = useProfile().data;
  const createProject = useCreateProject();
  const toggleProjectSelection = useToggleProjectSelection();
  const showToast = useUiStore((state) => state.showToast);
  const [importing, setImporting] = useState(false);

  const toggleProject = async (projectId: string) => {
    try {
      await toggleProjectSelection.mutateAsync(projectId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось обновить выбор проекта.', 'error');
    }
  };

  const importGitHubProjects = async () => {
    const username = githubUsernameFromUrl(profile?.links.github);

    if (!username) {
      showToast('Добавьте ссылку на GitHub в редакторе профиля.', 'error');
      return;
    }

    setImporting(true);

    try {
      const selectedIds = projects.filter((project) => project.selected).map((project) => project.id);
      const existingRepositoryUrls = new Set(projects.map((project) => project.repositoryUrl).filter(Boolean));
      const existingGitHubProjects = projects.filter((project) => project.repositoryUrl?.includes(`github.com/${username}/`));
      let repositories: GitHubRepository[];

      try {
        repositories = await fetchGitHubRepositories(username);
      } catch (error) {
        if (existingGitHubProjects.length > 0) {
          showToast('Импортированные проекты уже доступны ниже. GitHub API можно обновить позже.', 'info');
          return;
        }

        throw error;
      }

      const repositoriesToImport = repositories.filter((repo) => !existingRepositoryUrls.has(repo.html_url));
      let importedCount = 0;
      let failedCount = 0;

      for (const repository of repositoriesToImport) {
        try {
          await createProject.mutateAsync(repoToProject(repository));
          importedCount += 1;
        } catch (error) {
          console.warn(`Could not import repository ${repository.full_name}`, error);
          failedCount += 1;
        }
      }

      api.setSelectedProjectIds(selectedIds);
      await queryClient.invalidateQueries({ queryKey: portfolioKeys.projects });
      await queryClient.invalidateQueries({ queryKey: portfolioKeys.site });

      if (repositoriesToImport.length === 0) {
        showToast('Все доступные репозитории уже импортированы. Выберите нужные карточки ниже.', 'info');
      } else if (importedCount > 0 && failedCount > 0) {
        showToast(`Импортировано проектов: ${importedCount}. Некоторые репозитории пропущены, остальные можно выбрать ниже.`, 'info');
      } else if (importedCount > 0) {
        showToast(`Импортировано проектов: ${importedCount}. Выберите карточки, которые должны попасть на публичную страницу.`);
      } else {
        showToast('Новые репозитории не добавились. Уже импортированные проекты можно выбирать ниже.', 'info');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не удалось импортировать проекты.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="page active legacy-page" id="projects">
      <div className="page-inner">
        <div className="section-head reveal visible">
          <div>
            <div className="eyebrow"><span /> PROJECTS</div>
            <h2>Проекты для витрины</h2>
          </div>
          <button type="button" className="primary-btn" onClick={importGitHubProjects} disabled={importing || createProject.isPending}>
            {importing || createProject.isPending ? 'Импортируем…' : 'Импортировать'}
          </button>
        </div>
        <div className="wide-banner reveal visible">
          <img src="/assets/project_cards.jpeg" alt="Карточки проектов" />
          <div className="banner-copy">
            <h3>Каждый проект — как отдельный кейс</h3>
            <p>Импортируйте репозитории GitHub и выберите карточки, которые должны появиться на публичной странице.</p>
          </div>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className={`project-card reveal visible delay-${Math.min(index, 3)}${project.selected ? ' selected' : ''}`}
              onClick={() => void toggleProject(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void toggleProject(project.id);
                }
              }}
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
