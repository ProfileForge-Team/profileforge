# ProfileForge Frontend — v2

Фронтенд приведён в соответствие с архитектурой проекта:

- **React + Vite + TypeScript**;
- **React Router** для маршрутов;
- **TanStack Query** для загрузки и обновления серверных данных;
- **Zustand** для сессии и UI-уведомлений;
- **Tailwind CSS** для интерфейса;
- **Framer Motion** для анимации;
- **React Hook Form + Zod** для форм и валидации.

## Что реализовано

- лендинг;
- вход и регистрация;
- dashboard с готовностью страницы и базовой аналитикой;
- редактор профиля: username, имя, специализация, описание, навыки, контакты;
- редактор портфолио: ручное добавление проектов, выбор показа проекта, включение и выключение блоков;
- выбор одного из четырёх шаблонов;
- публикация страницы;
- публичная страница по маршруту `/u/:slug`;
- раздел «Топ портфолио» с демонстрационными лайками.

## Связь с backend

Весь код взаимодействия с сервером находится в `src/api/client.ts`. В режиме реального backend **frontend обращается только к API Gateway**, а не к Auth/Profile/Site Service напрямую.

Маршруты заданы в соответствии с архитектурным документом:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/profiles/me
PATCH /api/profiles/me
GET  /api/profiles/check-username/{username}
GET  /api/sites/me
POST /api/sites
PATCH /api/sites/{site_id}
POST /api/sites/{site_id}/publish
GET  /api/public/{slug}
```

> Важно: когда backend-команда окончательно зафиксирует реальные JSON-схемы ответов, нужно будет при необходимости поправить только адаптеры в `src/api/client.ts`. Компоненты страниц менять не потребуется.

## Запуск в демонстрационном режиме

1. Откройте папку `frontend` в терминале.
2. Установите зависимости:

```bash
npm install
```

3. Создайте `.env` на основе `.env.example`:

```bash
copy .env.example .env
```

На macOS/Linux:

```bash
cp .env.example .env
```

4. Запустите приложение:

```bash
npm run dev
```

Откройте адрес, который покажет Vite, обычно:

```text
http://localhost:5173
```

По умолчанию используется реальный API Gateway. Для демонстрации без backend можно установить `VITE_USE_MOCK_API=true`: данные будут храниться в `localStorage`.

## Подключение API Gateway

Когда gateway готов и доступен, в `.env` установите:

```env
VITE_API_BASE_URL=http://localhost:18000
VITE_USE_MOCK_API=false
```

После этого перезапустите `npm run dev`.

## Сборка

```bash
npm run build
```
