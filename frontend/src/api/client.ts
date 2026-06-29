import type {
  AuthSession,
  DashboardSummary,
  PortfolioProject,
  Profile,
  PublicPortfolio,
  Site,
  SiteBlock,
  SiteBlockType,
  TemplateKey,
  TemplateOption,
  User
} from '../types/domain';
import { demoProfile, demoPublicPortfolio, demoSite } from './mockData';

const STORAGE_KEY = 'profileforge:frontend-v2';
const PROJECT_SELECTION_KEY = 'profileforge:selected-project-ids';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:18000').replace(/\/$/, '');
const USE_MOCK_API = String(import.meta.env.VITE_USE_MOCK_API ?? 'false').toLowerCase() === 'true';

type DemoState = {
  profile: Profile;
  site: Site;
  user: User;
};

type BackendUser = {
  id: string;
  email: string;
  is_active?: boolean;
};

type BackendToken = {
  access_token: string;
  refresh_token: string;
};

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type BackendSocialLink = {
  type: string;
  url: string;
};

type BackendProfile = {
  id?: string;
  user_id?: string;
  username?: string | null;
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[] | null;
  social_links?: BackendSocialLink[] | null;
  projects?: BackendProject[] | null;
};

type BackendProject = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  repository_url?: string | null;
  tags?: string[] | null;
  position?: number | null;
};

type BackendSite = {
  id: string;
  title: string;
  slug: string;
  status: string;
  template_id: string;
  public_url?: string | null;
};

type BackendBlock = {
  id: string;
  type: SiteBlockType;
  position: number;
  content?: Record<string, unknown>;
};

type BackendTemplate = {
  id: string;
  name: string;
  description: string;
  preview_image?: string | null;
};

type BackendDashboardSummary = {
  profile_completed: boolean;
  projects_count: number;
  has_site: boolean;
  site_status: string | null;
  site_published: boolean;
  public_url: string | null;
  blocks_count: number;
  missing_required_blocks: SiteBlockType[];
};

type BackendPublicSite = {
  site_id: string;
  title: string;
  slug: string;
  status: string;
  template_id: string;
  blocks: Array<{
    type: SiteBlockType;
    position: number;
    content: Record<string, unknown>;
  }>;
};

type PublicBlockContent = Record<string, unknown>;

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getDemoState(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DemoState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const initial: DemoState = {
    profile: clone(demoProfile),
    site: clone(demoSite),
    user: { id: 'demo-user-1', email: 'demo@profileforge.app' }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveDemoState(next: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function readSelectedProjectIds(): Set<string> | null {
  const raw = localStorage.getItem(PROJECT_SELECTION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    localStorage.removeItem(PROJECT_SELECTION_KEY);
    return null;
  }
}

function writeSelectedProjectIds(ids: Iterable<string>): void {
  localStorage.setItem(PROJECT_SELECTION_KEY, JSON.stringify([...ids]));
}

function selectedIdsFromProjects(projects: PortfolioProject[]): Set<string> {
  const stored = readSelectedProjectIds();
  if (stored) return stored;

  return new Set(projects.filter((project) => project.selected).map((project) => project.id));
}

function applyProjectSelection(projects: PortfolioProject[]): PortfolioProject[] {
  const stored = readSelectedProjectIds();
  if (!stored) return projects.map((project) => ({ ...project, selected: true }));

  return projects.map((project) => ({ ...project, selected: stored.has(project.id) }));
}

function isDemoImportProject(project: PortfolioProject): boolean {
  return project.title === 'GitHub Portfolio Import'
    && project.repositoryUrl === 'https://github.com/';
}

function removeDemoImportProject(projects: PortfolioProject[]): PortfolioProject[] {
  return projects.filter((project) => !isDemoImportProject(project));
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Could not reach API Gateway.';

  const payload = body as {
    detail?: unknown;
    message?: unknown;
    error?: { message?: unknown; code?: unknown };
  };

  if (typeof payload.detail === 'string') return payload.detail;
  if (payload.detail && typeof payload.detail === 'object') {
    const detail = payload.detail as { error?: { message?: unknown; code?: unknown } };
    if (typeof detail.error?.message === 'string') return detail.error.message;
    if (typeof detail.error?.code === 'string') return detail.error.code;
  }
  if (typeof payload.error?.message === 'string') return payload.error.message;
  if (typeof payload.error?.code === 'string') return payload.error.code;
  if (typeof payload.message === 'string') return payload.message;

  return 'Could not reach API Gateway.';
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body), response.status);
  }

  return unwrap<T>(body);
}

function normalizeUser(user: BackendUser): User {
  return { id: user.id, email: user.email };
}

function normalizeSessionTokens(tokens: BackendToken | SessionTokens): SessionTokens {
  if ('access_token' in tokens) {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };
  }

  return tokens;
}

async function buildGatewaySession(tokens: BackendToken | SessionTokens): Promise<AuthSession> {
  const normalizedTokens = normalizeSessionTokens(tokens);
  const user = await request<BackendUser>('/api/auth/me', {}, normalizedTokens.accessToken);
  return { ...normalizedTokens, user: normalizeUser(user) };
}

function buildDemoSession(email: string): AuthSession {
  const state = getDemoState();
  const next = { ...state, user: { ...state.user, email } };
  saveDemoState(next);
  return {
    accessToken: 'demo-profileforge-token',
    refreshToken: 'demo-profileforge-refresh-token',
    user: next.user
  };
}

function linksFromBackend(links: BackendSocialLink[] | null | undefined): Profile['links'] {
  return (links ?? []).reduce<Profile['links']>((acc, link) => {
    if (link.type === 'github' || link.type === 'telegram' || link.type === 'linkedin' || link.type === 'email') {
      acc[link.type] = link.url;
    }
    return acc;
  }, {});
}

function linksToBackend(links: Profile['links'] | undefined): BackendSocialLink[] | undefined {
  if (!links) return undefined;
  return Object.entries(links)
    .filter(([, url]) => Boolean(url))
    .map(([type, url]) => ({ type, url: String(url) }));
}

function normalizeProfile(profile: BackendProfile): Profile {
  return {
    userId: profile.user_id ?? profile.id,
    username: profile.username ?? '',
    displayName: profile.display_name ?? '',
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    location: profile.location ?? '',
    skills: profile.skills ?? [],
    links: linksFromBackend(profile.social_links)
  };
}

function profilePatchToBackend(patch: Partial<Profile>): Partial<BackendProfile> {
  return {
    username: patch.username,
    display_name: patch.displayName,
    headline: patch.headline,
    bio: patch.bio,
    location: patch.location,
    skills: patch.skills,
    social_links: linksToBackend(patch.links)
  };
}

function normalizeProject(project: BackendProject): PortfolioProject {
  return {
    id: project.id,
    title: project.title,
    description: project.description ?? '',
    technologies: project.tags ?? [],
    repositoryUrl: project.repository_url ?? undefined,
    demoUrl: project.url ?? undefined,
    selected: true,
    position: project.position ?? 0
  };
}

function projectToBackend(project: Partial<PortfolioProject>, position = 0): Partial<BackendProject> {
  return {
    title: project.title,
    description: project.description,
    url: project.demoUrl,
    repository_url: project.repositoryUrl,
    tags: project.technologies,
    position: project.position ?? position
  };
}

function siteTemplateFromBackend(templateId: string): TemplateKey {
  const map: Record<string, TemplateKey> = {
    default: 'clean',
    'dark-developer': 'developer',
    'minimal-resume': 'minimal',
    'cyber-showcase': 'cyber'
  };
  return map[templateId] ?? (templateId as TemplateKey);
}

function siteTemplateToBackend(template: TemplateKey | undefined): string | undefined {
  if (!template) return undefined;
  const map: Record<TemplateKey, string> = {
    developer: 'dark-developer',
    minimal: 'minimal-resume',
    cyber: 'cyber-showcase',
    clean: 'default',
    default: 'default',
    'dark-developer': 'dark-developer',
    'minimal-resume': 'minimal-resume',
    'cyber-showcase': 'cyber-showcase'
  };
  return map[template];
}

function blockTitle(type: SiteBlockType): string {
  const map: Record<SiteBlockType, string> = {
    about: 'About',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    achievements: 'Achievements',
    contacts: 'Contacts'
  };
  return map[type];
}

function normalizeBlock(block: BackendBlock): SiteBlock {
  return {
    id: block.id,
    type: block.type,
    title: typeof block.content?.title === 'string' ? block.content.title : blockTitle(block.type),
    isVisible: block.content?.isVisible !== false,
    position: block.position,
    content: block.content
  };
}

function normalizeSite(site: BackendSite, blocks: BackendBlock[] = [], projects: PortfolioProject[] = []): Site {
  return {
    id: site.id,
    slug: site.slug,
    title: site.title,
    template: siteTemplateFromBackend(site.template_id),
    isPublished: site.status === 'published',
    status: site.status,
    publicUrl: site.public_url ?? null,
    blocks: blocks.map(normalizeBlock),
    projects
  };
}

function normalizeTemplate(template: BackendTemplate): TemplateOption {
  const key = siteTemplateFromBackend(template.id);
  const imageByKey: Record<string, string> = {
    developer: 'developer_template.jpeg',
    minimal: 'minimal_resume.jpeg',
    cyber: 'template_select.jpeg',
    clean: 'reference_layout.jpeg'
  };

  return {
    key,
    title: template.name,
    text: template.description,
    image: template.preview_image ?? imageByKey[key] ?? 'template_select.jpeg'
  };
}

function sitePatchToBackend(patch: Partial<Site>): Partial<BackendSite> {
  return {
    title: patch.title,
    slug: patch.slug,
    template_id: siteTemplateToBackend(patch.template)
  };
}

function makeSlug(value: string | undefined): string {
  const slug = (value || `profile-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return slug.length >= 3 ? slug : `profile-${slug}`.slice(0, 50);
}

async function getOrCreateSite(token?: string | null): Promise<BackendSite> {
  try {
    return await request<BackendSite>('/api/sites/me', {}, token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  const profile = await api.getProfile(token);
  return request<BackendSite>('/api/sites', {
    method: 'POST',
    body: JSON.stringify({
      title: profile.displayName || profile.username || 'My ProfileForge page',
      slug: makeSlug(profile.username || profile.userId),
      template_id: 'dark-developer'
    })
  }, token);
}

async function getBlocks(siteId: string, token?: string | null): Promise<BackendBlock[]> {
  return request<BackendBlock[]>(`/api/sites/${encodeURIComponent(siteId)}/blocks`, {}, token);
}

async function upsertSiteBlock(
  site: Site,
  type: SiteBlockType,
  position: number,
  content: PublicBlockContent,
  token?: string | null
): Promise<void> {
  const existing = site.blocks.find((block) => block.type === type);
  const basePath = `/api/sites/${encodeURIComponent(site.id)}/blocks`;

  if (existing) {
    await request<BackendBlock>(`${basePath}/${encodeURIComponent(existing.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ position, content })
    }, token);
    return;
  }

  await request<BackendBlock>(basePath, {
    method: 'POST',
    body: JSON.stringify({ type, position, content })
  }, token);
}

async function syncPublicSnapshotBlocks(site: Site, profile: Profile, token?: string | null): Promise<void> {
  const selectedProjects = site.projects.filter((project) => project.selected);

  await upsertSiteBlock(site, 'about', 0, {
    title: 'О себе',
    body: profile.bio || profile.headline || profile.displayName || profile.username || 'ProfileForge portfolio',
    profile: {
      username: profile.username,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      avatarUrl: profile.avatarUrl,
      skills: profile.skills,
      links: profile.links
    }
  }, token);

  await upsertSiteBlock(site, 'projects', 1, {
    title: 'Проекты',
    projects: selectedProjects
  }, token);

  await upsertSiteBlock(site, 'skills', 2, {
    title: 'Навыки',
    skills: profile.skills
  }, token);

  await upsertSiteBlock(site, 'contacts', 3, {
    title: 'Контакты',
    links: profile.links
  }, token);
}

function readLinks(value: unknown): Profile['links'] {
  if (!isRecord(value)) return {};

  return {
    email: readOptionalString(value.email),
    github: readOptionalString(value.github),
    telegram: readOptionalString(value.telegram),
    linkedin: readOptionalString(value.linkedin)
  };
}

function publicContentByType(publicSite: BackendPublicSite, type: SiteBlockType): PublicBlockContent {
  return publicSite.blocks.find((block) => block.type === type)?.content ?? {};
}

function readPublicProjects(value: unknown): PortfolioProject[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((project, index) => ({
    id: readString(project.id, `public-project-${index}`),
    title: readString(project.title, 'Project'),
    description: readString(project.description),
    technologies: readStringArray(project.technologies),
    repositoryUrl: readOptionalString(project.repositoryUrl),
    demoUrl: readOptionalString(project.demoUrl),
    selected: true,
    position: typeof project.position === 'number' ? project.position : index
  }));
}

function publicProfileFromBlocks(publicSite: BackendPublicSite): Profile {
  const about = publicContentByType(publicSite, 'about');
  const skills = publicContentByType(publicSite, 'skills');
  const contacts = publicContentByType(publicSite, 'contacts');
  const profile = isRecord(about.profile) ? about.profile : {};
  const profileLinks = readLinks(profile.links);
  const contactLinks = readLinks(contacts.links);
  const profileSkills = readStringArray(profile.skills);
  const blockSkills = readStringArray(skills.skills);

  return {
    userId: publicSite.site_id,
    username: readString(profile.username, publicSite.slug),
    displayName: readString(profile.displayName, publicSite.title),
    headline: readString(profile.headline),
    bio: readString(profile.bio, readString(about.body)),
    location: readString(profile.location),
    avatarUrl: readOptionalString(profile.avatarUrl),
    skills: profileSkills.length ? profileSkills : blockSkills,
    links: Object.values(profileLinks).some(Boolean) ? profileLinks : contactLinks
  };
}

export const api = {
  mode: USE_MOCK_API ? 'demo' : 'gateway',

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    if (USE_MOCK_API) return buildDemoSession(input.email);
    const token = await request<BackendToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return buildGatewaySession(token);
  },

  async register(input: { email: string; password: string }): Promise<AuthSession> {
    if (USE_MOCK_API) return buildDemoSession(input.email);
    await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return this.login(input);
  },

  async getCurrentUser(token?: string | null): Promise<User> {
    if (USE_MOCK_API) return getDemoState().user;
    return normalizeUser(await request<BackendUser>('/api/auth/me', {}, token));
  },

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    if (USE_MOCK_API) return buildDemoSession(getDemoState().user.email);
    const token = await request<BackendToken>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return buildGatewaySession(token);
  },

  async getProfile(token?: string | null): Promise<Profile> {
    if (USE_MOCK_API) return clone(getDemoState().profile);
    return normalizeProfile(await request<BackendProfile>('/api/profiles/me', {}, token));
  },

  async updateProfile(patch: Partial<Profile>, token?: string | null): Promise<Profile> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next: DemoState = {
        ...state,
        profile: {
          ...state.profile,
          ...patch,
          links: { ...state.profile.links, ...(patch.links ?? {}) }
        }
      };
      saveDemoState(next);
      return clone(next.profile);
    }

    return normalizeProfile(await request<BackendProfile>('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(profilePatchToBackend(patch))
    }, token));
  },

  async checkUsername(username: string, token?: string | null): Promise<{ available: boolean }> {
    if (USE_MOCK_API) {
      const current = getDemoState().profile.username;
      return { available: username === current || !['admin', 'profileforge', 'test'].includes(username.toLowerCase()) };
    }
    return request<{ available: boolean }>(`/api/profiles/check-username/${encodeURIComponent(username)}`, {}, token);
  },

  async getProjects(token?: string | null): Promise<PortfolioProject[]> {
    if (USE_MOCK_API) return removeDemoImportProject(applyProjectSelection(clone(getDemoState().site.projects)));
    const projects = await request<BackendProject[]>('/api/profiles/me/projects', {}, token);
    return removeDemoImportProject(applyProjectSelection(projects.map(normalizeProject)));
  },

  async createProject(project: Partial<PortfolioProject>, token?: string | null): Promise<PortfolioProject> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const nextProject: PortfolioProject = {
        id: `project-${Date.now()}`,
        title: project.title ?? 'Project',
        description: project.description ?? '',
        technologies: project.technologies ?? [],
        repositoryUrl: project.repositoryUrl,
        demoUrl: project.demoUrl,
        selected: true,
        position: state.site.projects.length
      };
      const next = { ...state, site: { ...state.site, projects: [...state.site.projects, nextProject] } };
      saveDemoState(next);
      return clone(nextProject);
    }

    const projects = await this.getProjects(token);
    const created = await request<BackendProject>('/api/profiles/me/projects', {
      method: 'POST',
      body: JSON.stringify(projectToBackend(project, projects.length))
    }, token);
    return normalizeProject(created);
  },

  setSelectedProjectIds(projectIds: string[]): void {
    writeSelectedProjectIds(projectIds);
  },

  toggleProjectSelection(projectId: string, projects: PortfolioProject[]): PortfolioProject[] {
    const selectedIds = selectedIdsFromProjects(projects);

    if (selectedIds.has(projectId)) {
      selectedIds.delete(projectId);
    } else {
      selectedIds.add(projectId);
    }

    writeSelectedProjectIds(selectedIds);
    return applyProjectSelection(projects);
  },

  async getSite(token?: string | null): Promise<Site> {
    if (USE_MOCK_API) return clone(getDemoState().site);
    const site = await getOrCreateSite(token);
    const [blocks, projects] = await Promise.all([
      getBlocks(site.id, token),
      this.getProjects(token)
    ]);
    return normalizeSite(site, blocks, projects);
  },

  async createSite(input: Partial<Site>, token?: string | null): Promise<Site> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next = { ...state, site: { ...state.site, ...input } };
      saveDemoState(next);
      return clone(next.site);
    }
    const profile = await this.getProfile(token);
    const site = await request<BackendSite>('/api/sites', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title ?? profile.displayName ?? profile.username ?? 'My ProfileForge page',
        slug: input.slug ?? makeSlug(profile.username || profile.userId),
        template_id: siteTemplateToBackend(input.template) ?? 'dark-developer'
      })
    }, token);
    return normalizeSite(site, [], await this.getProjects(token));
  },

  async updateSite(siteId: string, patch: Partial<Site>, token?: string | null): Promise<Site> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next = { ...state, site: { ...state.site, ...patch } };
      saveDemoState(next);
      return clone(next.site);
    }

    await request<BackendSite>(`/api/sites/${encodeURIComponent(siteId)}`, {
      method: 'PATCH',
      body: JSON.stringify(sitePatchToBackend(patch))
    }, token);
    return this.getSite(token);
  },

  async publishSite(siteId: string, token?: string | null): Promise<Site> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      const next = { ...state, site: { ...state.site, isPublished: true } };
      saveDemoState(next);
      return clone(next.site);
    }

    const profile = await this.getProfile(token);
    const site = await this.getSite(token);
    const publicSlug = makeSlug(profile.username || site.slug);
    const siteForPublish = site.slug === publicSlug
      ? site
      : await this.updateSite(siteId, { slug: publicSlug }, token);

    await syncPublicSnapshotBlocks(siteForPublish.id === siteId ? siteForPublish : { ...siteForPublish, id: siteId }, profile, token);
    await request(`/api/sites/${encodeURIComponent(siteId)}/publish`, { method: 'POST' }, token);
    return this.getSite(token);
  },

  async getTemplates(): Promise<TemplateOption[]> {
    if (USE_MOCK_API) {
      return [
        { key: 'developer', title: 'Dark Developer', text: 'High-contrast dark layout for developer portfolios.', image: 'developer_template.jpeg' },
        { key: 'minimal', title: 'Minimal Resume', text: 'Clean resume-first layout with restrained visual styling.', image: 'minimal_resume.jpeg' },
        { key: 'cyber', title: 'Cyber Showcase', text: 'Expressive portfolio layout for project-heavy pages.', image: 'template_select.jpeg' }
      ];
    }

    const templates = await request<BackendTemplate[]>('/api/sites/templates');
    return templates.map(normalizeTemplate);
  },

  async getDashboardSummary(token?: string | null): Promise<DashboardSummary> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      return {
        profileCompleted: Boolean(state.profile.username && state.profile.displayName && state.profile.headline),
        projectsCount: state.site.projects.length,
        hasSite: true,
        siteStatus: state.site.isPublished ? 'published' : 'draft',
        sitePublished: state.site.isPublished,
        publicUrl: null,
        blocksCount: state.site.blocks.length,
        missingRequiredBlocks: state.site.blocks.some((block) => block.type === 'about') ? [] : ['about']
      };
    }

    const summary = await request<BackendDashboardSummary>('/api/dashboard/summary', {}, token);
    return {
      profileCompleted: summary.profile_completed,
      projectsCount: summary.projects_count,
      hasSite: summary.has_site,
      siteStatus: summary.site_status,
      sitePublished: summary.site_published,
      publicUrl: summary.public_url,
      blocksCount: summary.blocks_count,
      missingRequiredBlocks: summary.missing_required_blocks
    };
  },

  async getPublicPortfolio(slug: string): Promise<PublicPortfolio> {
    if (USE_MOCK_API) {
      const state = getDemoState();
      if (slug !== state.site.slug && slug !== state.profile.username) return clone(demoPublicPortfolio);
      return { profile: clone(state.profile), site: clone(state.site) };
    }

    const publicSite = await request<BackendPublicSite>(`/api/public/${encodeURIComponent(slug)}`);
    const projectsBlock = publicContentByType(publicSite, 'projects');
    return {
      profile: publicProfileFromBlocks(publicSite),
      site: normalizeSite({
        id: publicSite.site_id,
        title: publicSite.title,
        slug: publicSite.slug,
        status: publicSite.status,
        template_id: publicSite.template_id,
        public_url: null
      }, publicSite.blocks.map((block, index) => ({
        id: `${publicSite.site_id}-${block.type}-${index}`,
        type: block.type,
        position: block.position,
        content: block.content
      })), readPublicProjects(projectsBlock.projects))
    };
  }
};
