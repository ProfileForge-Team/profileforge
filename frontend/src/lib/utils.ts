import type { SiteBlockType, TemplateKey } from '../types/domain';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PF';
}

export function templateLabel(template: TemplateKey): string {
  return {
    developer: 'Тёмный разработчик',
    minimal: 'Минимальное резюме',
    cyber: 'Cyber / digital',
    clean: 'Чистое портфолио'
  }[template];
}

export function blockLabel(type: SiteBlockType): string {
  return {
    about: 'О себе',
    skills: 'Навыки',
    projects: 'Проекты',
    contacts: 'Контакты'
  }[type];
}

export function siteUrl(slug: string): string {
  return `profileforge.app/${slug}`;
}

export function safeExternalUrl(value?: string): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
