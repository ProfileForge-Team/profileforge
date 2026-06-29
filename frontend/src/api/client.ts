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

/** Deep-clones demo data so mock mode never mutates shared constants. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Checks whether an unknown value is a plain object that can be safely read. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Reads a string from untrusted API content and falls back when missing. */
function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Reads a non-empty optional string from untrusted API content. */
function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/** Reads a string array from untrusted API content. */
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Loads or initializes the localStorage-backed demo mode state. */
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

/** Persists demo mode state to localStorage. */
function saveDemoState(next: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Reads the local project selection set used by the public portfolio snapshot. */
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

/** Persists project ids selected for the public portfolio. */
function writeSelectedProjectIds(ids: Iterable<string>): void {
  localStorage.setItem(PROJECT_SELECTION_KEY, JSON.stringify([...ids]));
}

/** Builds the active selection set from localStorage or current project flags. */
function selectedIdsFromProjects(projects: PortfolioProject[]): Set<string> {
  const stored = readSelectedProjectIds();
  if (stored) return stored;

  return new Set(projects.filter((project) => project.selected).map((project) => project.id));
}

/** Applies the saved project selection state to a project list. */
function applyProjectSelection(projects: PortfolioProject[]): PortfolioProject[] {
  const stored = readSelectedProjectIds();
  if (!stored) return projects.map((project) => ({ ...project, selected: true }));

  return projects.map((project) => ({ ...project, selected: stored.has(project.id) }));
}

/** Detects the old placeholder import card so it does not leak into real UI. */
function isDemoImportProject(project: PortfolioProject): boolean {
  return project.title === 'GitHub Portfolio Import'
    && project.repositoryUrl === 'https://github.com/';
}

/** Removes the old placeholder import card from project lists. */
function removeDemoImportProject(projects: PortfolioProject[]): PortfolioProject[] {
  return projects.filter((project) => !isDemoImportProject(project));
}

/** Supports both raw backend payloads and `{ data }` wrapped payloads. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

/** Normalizes backend error shapes into a user-facing message. */
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

/** Sends a request through API Gateway and throws ApiError for non-2xx responses. */
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

/** Converts an auth-service user DTO into the frontend domain user. */
function normalizeUser(user: BackendUser): User {
  return { id: user.id, email: user.email };
}

/** Converts snake_case backend token fields into frontend camelCase fields. */
function normalizeSessionTokens(tokens: BackendToken | SessionTokens): SessionTokens {
  if ('access_token' in tokens) {
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };
  }

  return tokens;
}

/** Builds a full frontend session by loading the current user after token creation. */
async function buildGatewaySession(tokens: BackendToken | SessionTokens): Promise<AuthSession> {
  const normalizedTokens = normalizeSessionTokens(tokens);
  const user = await request<BackendUser>('/api/auth/me', {}, normalizedTokens.accessToken);
  return { ...normalizedTokens, user: normalizeUser(user) };
}

/** Creates a fake session for local mock mode. */
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

/** Converts backend social link rows into the frontend profile links object. */
function linksFromBackend(links: BackendSocialLink[] | null | undefined): Profile['links'] {
  return (links ?? []).reduce<Profile['links']>((acc, link) => {
    if (link.type === 'github' || link.type === 'telegram' || link.type === 'linkedin' || link.type === 'email') {
      acc[link.type] = link.url;
    }
    return acc;
  }, {});
}

/** Converts frontend profile links into backend social link rows. */
function linksToBackend(links: Profile['links'] | undefined): BackendSocialLink[] | undefined {
  if (!links) return undefined;
  return Object.entries(links)
    .filter(([, url]) => Boolean(url))
    .map(([type, url]) => ({ type, url: String(url) }));
}

/** Converts profile-service DTOs into the frontend profile model. */
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

/** Converts a frontend profile patch into profile-service field names. */
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

/** Converts a profile-service project DTO into a frontend project card. */
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

/** Converts a frontend project patch/create payload into backend field names. */
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

/** Maps site-service template ids to frontend template keys. */
function siteTemplateFromBackend(templateId: string): TemplateKey {
  const map: Record<string, TemplateKey> = {
    default: 'clean',
    'dark-developer': 'developer',
    'minimal-resume': 'minimal',
    'cyber-showcase': 'cyber'
  };
  return map[templateId] ?? (templateId as TemplateKey);
}

/** Maps frontend template keys back to site-service template ids. */
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

/** Returns a default display title for a site block type. */
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

/** Converts a site-service block DTO into a frontend block model. */
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

/** Combines site metadata, blocks, and projects into one frontend site model. */
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

/** Converts backend template metadata into a frontend template card. */
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

/** Converts a frontend site patch into site-service field names. */
function sitePatchToBackend(patch: Partial<Site>): Partial<BackendSite> {
  return {
    title: patch.title,
    slug: patch.slug,
    template_id: siteTemplateToBackend(patch.template)
  };
}

/** Creates a URL-safe profile slug from username-like input. */
function makeSlug(value: string | undefined): string {
  const slug = (value || `profile-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return slug.length >= 3 ? slug : `profile-${slug}`.slice(0, 50);
}

/** Loads the current site or creates the MVP default site on first use. */
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

/** Loads all blocks for a site through API Gateway. */
async function getBlocks(siteId: string, token?: string | null): Promise<BackendBlock[]> {
  return request<BackendBlock[]>(`/api/sites/${encodeURIComponent(siteId)}/blocks`, {}, token);
}

/** Creates or updates one public snapshot block by block type. */
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

/** Syncs profile, selected projects, skills, and contacts into site blocks. */
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

/** Reads contact links from public block content. */
function readLinks(value: unknown): Profile['links'] {
  if (!isRecord(value)) return {};

  return {
    email: readOptionalString(value.email),
    github: readOptionalString(value.github),
    telegram: readOptionalString(value.telegram),
    linkedin: readOptionalString(value.linkedin)
  };
}

/** Finds content for one block type in a public portfolio payload. */
function publicContentByType(publicSite: BackendPublicSite, type: SiteBlockType): PublicBlockContent {
  return publicSite.blocks.find((block) => block.type === type)?.content ?? {};
}

/** Reads selected public projects from a published site block. */
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

/** Rebuilds the read-only profile model from published site blocks. */
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

  /** Authenticates a user and returns a hydrated frontend session. */
  async login(input: { email: string; password: string }): Promise<AuthSession> {
    if (USE_MOCK_API) return buildDemoSession(input.email);
    const token = await request<BackendToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return buildGatewaySession(token);
  },

  /** Registers a user and immediately logs in with the same credentials. */
  async register(input: { email: string; password: string }): Promise<AuthSession> {
    if (USE_MOCK_API) return buildDemoSession(input.email);
    await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return this.login(input);
  },

  /** Loads the current auth user from the active access token. */
  async getCurrentUser(token?: string | null): Promise<User> {
    if (USE_MOCK_API) return getDemoState().user;
    return normalizeUser(await request<BackendUser>('/api/auth/me', {}, token));
  },

  /** Refreshes an expired access token and returns the replacement session. */
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    if (USE_MOCK_API) return buildDemoSession(getDemoState().user.email);
    const token = await request<BackendToken>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return buildGatewaySession(token);
  },

  /** Loads the editable profile for the current user. */
  async getProfile(token?: string | null): Promise<Profile> {
    if (USE_MOCK_API) return clone(getDemoState().profile);
    return normalizeProfile(await request<BackendProfile>('/api/profiles/me', {}, token));
  },

  /** Updates editable profile fields for the current user. */
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

  /** Checks whether a username can be used as a public profile handle. */
  async checkUsername(username: string, token?: string | null): Promise<{ available: boolean }> {
    if (USE_MOCK_API) {
      const current = getDemoState().profile.username;
      return { available: username === current || !['admin', 'profileforge', 'test'].includes(username.toLowerCase()) };
    }
    return request<{ available: boolean }>(`/api/profiles/check-username/${encodeURIComponent(username)}`, {}, token);
  },

  /** Loads portfolio projects and applies local public-page selection state. */
  async getProjects(token?: string | null): Promise<PortfolioProject[]> {
    if (USE_MOCK_API) return removeDemoImportProject(applyProjectSelection(clone(getDemoState().site.projects)));
    const projects = await request<BackendProject[]>('/api/profiles/me/projects', {}, token);
    return removeDemoImportProject(applyProjectSelection(projects.map(normalizeProject)));
  },

  /** Creates a new portfolio project in profile-service. */
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

  /** Replaces the local list of project ids selected for public display. */
  setSelectedProjectIds(projectIds: string[]): void {
    writeSelectedProjectIds(projectIds);
  },

  /** Toggles whether a project should be included in the public portfolio snapshot. */
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

  /** Loads or creates the current site, then joins blocks and projects for the UI. */
  async getSite(token?: string | null): Promise<Site> {
    if (USE_MOCK_API) return clone(getDemoState().site);
    const site = await getOrCreateSite(token);
    const [blocks, projects] = await Promise.all([
      getBlocks(site.id, token),
      this.getProjects(token)
    ]);
    return normalizeSite(site, blocks, projects);
  },

  /** Creates a site explicitly when the UI needs to initialize publication state. */
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

  /** Updates site metadata and returns the refreshed full site model. */
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

  /** Publishes the site after syncing profile data into public snapshot blocks. */
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

  /** Loads available site templates for the template selector page. */
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

  /** Loads dashboard counters and readiness status from API Gateway. */
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

  /** Loads a read-only public portfolio by username or slug. */
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
