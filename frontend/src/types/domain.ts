export type TemplateKey = 'developer' | 'minimal' | 'cyber' | 'clean';

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
};

export type SiteBlockType = 'about' | 'skills' | 'projects' | 'contacts';

export type SiteBlock = {
  id: string;
  type: SiteBlockType;
  title: string;
  isVisible: boolean;
  position: number;
};

export type Site = {
  id: string;
  slug: string;
  template: TemplateKey;
  isPublished: boolean;
  blocks: SiteBlock[];
  projects: PortfolioProject[];
};

export type User = {
  id: string;
  email: string;
};

export type AuthSession = {
  accessToken: string;
  user: User;
};

export type PublicPortfolio = {
  profile: Profile;
  site: Site;
};

export type CommunityPortfolio = {
  username: string;
  displayName: string;
  headline: string;
  likes: number;
  views: number;
  template: TemplateKey;
  avatarUrl?: string;
};
