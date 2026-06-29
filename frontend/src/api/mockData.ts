import type { Profile, PublicPortfolio, Site } from '../types/domain';

export const demoProfile: Profile = {
  userId: 'demo-user-1',
  username: 'demo-profile',
  displayName: 'Иван Петров',
  headline: 'Frontend-разработчик',
  bio: 'Создаю современные веб-интерфейсы и сервисы. В портфолио показываю не только стек, но и результат работы: понятный интерфейс, удобный пользовательский сценарий и аккуратную реализацию.',
  location: 'Москва, Россия',
  avatarUrl: '/assets/avatar_hologram.jpeg',
  skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Git'],
  links: {
    github: 'https://github.com/',
    telegram: 'https://t.me/',
    email: 'hello@profileforge.app'
  }
};

export const demoSite: Site = {
  id: 'demo-site-1',
  slug: 'demo-profile',
  template: 'developer',
  isPublished: false,
  blocks: [
    { id: 'block-about', type: 'about', title: 'О себе', isVisible: true, position: 1 },
    { id: 'block-skills', type: 'skills', title: 'Навыки', isVisible: true, position: 2 },
    { id: 'block-projects', type: 'projects', title: 'Проекты', isVisible: true, position: 3 },
    { id: 'block-contacts', type: 'contacts', title: 'Контакты', isVisible: true, position: 4 }
  ],
  projects: [
    {
      id: 'project-finboard',
      title: 'FinBoard',
      description: 'Панель финансовой аналитики с графиками, фильтрами и сводкой расходов.',
      technologies: ['React', 'TypeScript', 'REST API'],
      repositoryUrl: 'https://github.com/',
      selected: true
    },
    {
      id: 'project-edutrack',
      title: 'EduTrack',
      description: 'Сервис для онлайн-обучения с прогрессом, уроками и личным кабинетом.',
      technologies: ['React', 'Node.js', 'UX'],
      repositoryUrl: 'https://github.com/',
      selected: true
    },
    {
      id: 'project-travelmate',
      title: 'TravelMate',
      description: 'Планировщик поездок с маршрутами, заметками и сохранением избранных мест.',
      technologies: ['HTML', 'CSS', 'JavaScript'],
      repositoryUrl: 'https://github.com/',
      selected: false
    }
  ]
};

export const demoPublicPortfolio: PublicPortfolio = {
  profile: demoProfile,
  site: demoSite
};
