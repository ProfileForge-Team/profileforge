import type { SiteBlockType, TemplateKey } from '../types/domain';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PF';
}

export function templateLabel(template: TemplateKey): string {
  const labels: Record<TemplateKey, string> = {
    developer: 'Dark Developer',
    minimal: 'Minimal Resume',
    cyber: 'Cyber Showcase',
    clean: 'Clean Portfolio',
    default: 'Clean Portfolio',
    'dark-developer': 'Dark Developer',
    'minimal-resume': 'Minimal Resume',
    'cyber-showcase': 'Cyber Showcase'
  };
  return labels[template];
}

export function blockLabel(type: SiteBlockType): string {
  const labels: Record<SiteBlockType, string> = {
    about: 'About',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    achievements: 'Achievements',
    contacts: 'Contacts'
  };
  return labels[type];
}

export function siteUrl(slug: string): string {
  return `profileforge.app/${slug}`;
}

export function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
