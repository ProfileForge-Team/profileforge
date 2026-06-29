export type TemplateKey =
  | 'developer'
  | 'minimal'
  | 'cyber'
  | 'clean'
  | 'default'
  | 'dark-developer'
  | 'minimal-resume'
  | 'cyber-showcase';

export type SocialLinks = {
  github?: string;
  telegram?: string;
  linkedin?: string;
  email?: string;
};

export type Profile = {
  userId?: string;
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  location: string;
  avatarUrl?: string;
  skills: string[];
  links: SocialLinks;
};

export type PortfolioProject = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  repositoryUrl?: string;
  demoUrl?: string;
  selected: boolean;
  position?: number;
};

export type SiteBlockType = 'about' | 'skills' | 'experience' | 'projects' | 'education' | 'achievements' | 'contacts';

export type SiteBlock = {
  id: string;
  type: SiteBlockType;
  title: string;
  isVisible: boolean;
  position: number;
  content?: Record<string, unknown>;
};

export type Site = {
  id: string;
  slug: string;
  template: TemplateKey;
  isPublished: boolean;
  blocks: SiteBlock[];
  projects: PortfolioProject[];
  title?: string;
  status?: string;
  publicUrl?: string | null;
};

export type User = {
  id: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type TemplateOption = {
  key: TemplateKey;
  title: string;
  text: string;
  image: string;
};

export type DashboardSummary = {
  profileCompleted: boolean;
  projectsCount: number;
  hasSite: boolean;
  siteStatus: string | null;
  sitePublished: boolean;
  publicUrl: string | null;
  blocksCount: number;
  missingRequiredBlocks: SiteBlockType[];
};

export type PublicPortfolio = {
  profile: Profile;
  site: Site;
};
