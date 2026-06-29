# ProfileForge Project Documentation

This document explains how the MVP is organized, how requests move through the system, and which modules own the main responsibilities.

## High-Level Architecture

ProfileForge is split into a React frontend and a small FastAPI microservice backend.

- `frontend` is the Vite + React + TypeScript application used by the user.
- `backend/services/api-gateway` is the public backend entry point for the frontend.
- `backend/services/auth-service` owns users, passwords, JWT access tokens, refresh tokens, and user registration events.
- `backend/services/profile-service` owns profile data, skills, social links, and portfolio projects.
- `backend/services/site-service` owns portfolio sites, site blocks, templates, publishing, and public portfolio data.
- `backend/infra/docker-compose.yml` wires the services together for local development.

The frontend should call only API Gateway. Direct service-to-service URLs are internal implementation details.

## Backend Request Flow

1. The frontend sends requests to `http://localhost:18000`.
2. API Gateway validates access tokens for protected routes.
3. API Gateway forwards authenticated requests to downstream services and injects `X-User-Id`.
4. Profile Service and Site Service use `X-User-Id` as the current user identity.
5. Public routes, such as `/api/public/{slug}`, do not require authentication.

## Authentication Flow

1. The user registers through `/api/auth/register`.
2. Auth Service stores the user and writes a `user.registered` outbox event.
3. Auth Worker publishes the event to RabbitMQ.
4. Profile Service consumes the event and creates an empty profile.
5. The frontend logs in through `/api/auth/login` and receives an access token and refresh token.
6. When the access token expires, the frontend calls `/api/auth/refresh` and retries the failed request.

## Portfolio Publishing Flow

1. The user edits profile data in the frontend editor.
2. The frontend saves profile fields to Profile Service.
3. The user imports or creates projects.
4. Selected projects are stored as frontend selection state and then included in the public snapshot.
5. The frontend syncs public snapshot blocks to Site Service:
   - `about`
   - `projects`
   - `skills`
   - `contacts`
6. The frontend calls `/api/sites/{site_id}/publish`.
7. Site Service marks the site as published and exposes it through `/api/public/{slug}`.
8. The frontend read-only portfolio page renders published data by username/slug.

## Frontend Data Layer

The frontend data layer lives in `frontend/src/api/client.ts` and `frontend/src/hooks/usePortfolio.ts`.

- `client.ts` translates backend DTOs into frontend domain models.
- `usePortfolio.ts` wraps API calls in React Query hooks.
- Auth retry logic lives in `withTokenRefresh`.
- Mock mode is controlled by `VITE_USE_MOCK_API`.

## Important Environment Variables

Frontend:

```env
VITE_API_BASE_URL=http://localhost:18000
VITE_USE_MOCK_API=false
```

Backend services read their own settings from service-specific `app/core/config.py` files and from Docker Compose environment variables.

## Local Development Commands

Start backend:

```bash
cd backend/infra
docker compose up -d --build
```

Start frontend:

```bash
cd frontend
npm ci
npm run dev
```

Build frontend:

```bash
cd frontend
npm run build
```

Run service tests from `backend/infra`:

```bash
docker compose exec auth-service pytest -q
docker compose exec profile-service pytest -q
docker compose exec site-service pytest -q
docker compose exec api-gateway pytest -q
```

Reset local service databases:

```bash
cd backend/infra
docker compose down -v
```

## Code Commenting Guidelines

Comments should explain why a function exists, which boundary it protects, or which data conversion it performs. Avoid comments that simply repeat the code line-by-line.

Use Python docstrings for backend functions and JSDoc comments for frontend functions when the function is part of application behavior, request routing, data normalization, or state synchronization.
