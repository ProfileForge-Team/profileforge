# ProfileForge

ProfileForge is an MVP platform for creating interactive online resumes and personal portfolios.

Users can register, manage a professional profile, create a portfolio page from content blocks, and publish it through a public URL.

## Architecture

ProfileForge uses a microservice architecture.

- API Gateway is the single external entry point for the frontend.
- Auth Service handles registration, login, JWT authentication, and transactional outbox events.
- Auth Worker publishes Auth Service outbox events to RabbitMQ.
- Profile Service manages profiles and creates an empty profile after user registration.
- Site Service manages portfolio sites, content blocks, publication, and site outbox events.
- RabbitMQ provides asynchronous communication between services.
- SQLite is used as a separate database for every service in the MVP.

More detailed project documentation is available in `docs/PROJECT_DOCUMENTATION.md`.

## Registration Flow

1. The frontend sends a registration request through API Gateway.
2. Auth Service creates a user and stores a user.registered event in its outbox.
3. Auth Worker publishes the event to RabbitMQ.
4. Profile Service receives the event.
5. Profile Service creates an empty profile and saves the event in processed_events.
6. The processed_events table prevents duplicate event handling.

## Project Structure

- frontend — frontend application.
- backend/docs — project documentation.
- backend/infra — Docker Compose configuration.
- backend/services/api-gateway — single Backend entry point.
- backend/services/auth-service — authentication, JWT, outbox, and Auth Worker.
- backend/services/profile-service — profiles and user.registered event handling.
- backend/services/site-service — portfolio sites, blocks, and publishing.
- backend/shared — shared contracts and schemas.

## Technology Stack

- Python 3.12
- FastAPI
- Uvicorn
- SQLAlchemy
- Alembic
- SQLite
- RabbitMQ
- aio-pika
- JWT
- Docker Compose
- pytest
- httpx

## Quick Start

Requirements:

- Docker Desktop with Linux Engine running.
- Git.
- PowerShell or another terminal.

Run all services:

1. Open the backend infrastructure directory:
   cd backend/infra

2. Validate Docker Compose:
   docker compose config --quiet

3. Build and start the services:
   docker compose up -d --build

4. Check container status:
   docker compose ps

## Useful URLs

- API Gateway health check: http://localhost:18000/health
- API Gateway readiness check: http://localhost:18000/ready
- RabbitMQ Management: http://localhost:15672

RabbitMQ development credentials:

- Login: profileforge
- Password: profileforge

## Main API Routes

- POST /api/auth/register — register a user.
- POST /api/auth/login — login and receive a JWT token.
- GET /api/auth/me — get current user data.
- GET /api/profiles/me — get current user profile.
- PATCH /api/profiles/me — update current profile.
- POST /api/sites — create a portfolio site.
- GET /api/sites/me — get current user site.
- POST /api/sites/{site_id}/blocks — add a portfolio block.
- POST /api/sites/{site_id}/publish — publish a site.
- GET /api/public/{slug} — get a public portfolio page.

Protected routes require this header:

Authorization: Bearer <access_token>

## Publishing a Site

A site must contain an about block before it can be published.

Published portfolio pages are available through API Gateway:

http://localhost:18000/api/public/<slug>

## Tests

Run all service tests from backend/infra:

- docker compose exec auth-service pytest -q
- docker compose exec profile-service pytest -q
- docker compose exec site-service pytest -q
- docker compose exec api-gateway pytest -q

Run the end-to-end test:

docker compose exec profile-service pytest -q tests/integration/test_end_to_end.py

The E2E test checks the following scenario:

registration
-> user.registered
-> RabbitMQ
-> automatic profile creation
-> login
-> profile update
-> site creation
-> about block
-> site publication
-> public portfolio page

## Git Workflow

Development is performed in feature branches.

Backend integration is performed in the Backend-MVP-test branch.

Changes must reach main only through a Pull Request after tests and review.
