# ProfileForge

ProfileForge is an MVP platform for creating interactive online resumes and personal portfolios.

Users can register, manage a professional profile, create a portfolio page from content blocks, and publish it through a public URL.

## Architecture

ProfileForge uses a microservice architecture:

- API Gateway: single external entry point for the frontend.
- Auth Service: registration, login, JWT authentication, and transactional outbox.
- Auth Worker: publishes Auth Service outbox events to RabbitMQ.
- Profile Service: manages profiles and creates an empty profile after `user.registered`.
- Site Service: manages portfolio sites, blocks, publication, and site outbox events.
- RabbitMQ: asynchronous communication between services.
- SQLite: separate database for each service in the MVP.

## Main Flow

```text
Frontend
  -> API Gateway
  -> Auth Service
  -> Auth Outbox
  -> Auth Worker
  -> RabbitMQ
  -> Profile Service

After registration, the user.registered event is stored in Auth Service Outbox, published to RabbitMQ, and processed by Profile Service. Profile Service creates an empty profile and records the event in processed_events to prevent duplicate processing.

Project Structure
ProfileForge/
├── frontend/                         # Frontend application
├── backend/
│   ├── docs/                         # Project documentation
│   ├── infra/
│   │   └── docker-compose.yml        # Docker Compose configuration
│   ├── services/
│   │   ├── api-gateway/
│   │   ├── auth-service/
│   │   ├── profile-service/
│   │   └── site-service/
│   ├── shared/
│   │   ├── contracts/
│   │   └── schemas/
│   └── tests/
└── README.md
Technology Stack
Python 3.12
FastAPI
Uvicorn
SQLAlchemy
Alembic
SQLite
RabbitMQ
aio-pika
JWT
Docker Compose
pytest
httpx
Run the Project

Requirements:

Docker Desktop with Linux Engine running.
Git.
PowerShell or another terminal.

Run all services:

cd backend/infra
docker compose config --quiet
docker compose up -d --build
docker compose ps
Useful URLs
PurposeURL
API Gateway health checkhttp://localhost:18000/health
API Gateway readiness checkhttp://localhost:18000/ready
RabbitMQ Managementhttp://localhost:15672

RabbitMQ credentials for local development:

Login: profileforge
Password: profileforge
API Routes
MethodRoutePurpose
POST/api/auth/registerRegister a user
POST/api/auth/loginLogin and get JWT
GET/api/auth/meGet current user
GET/api/profiles/meGet current profile
PATCH/api/profiles/meUpdate current profile
POST/api/sitesCreate a portfolio site
GET/api/sites/meGet current user site
POST/api/sites/{site_id}/blocksAdd a portfolio block
POST/api/sites/{site_id}/publishPublish a site
GET/api/public/{slug}Get public portfolio page

Protected routes require:

Authorization: Bearer <access_token>
Publishing a Site

A site must contain an about block before publication.

Published portfolios are available through API Gateway:

http://localhost:18000/api/public/<slug>
Tests

Run all service tests from backend/infra:

docker compose exec auth-service pytest -q
docker compose exec profile-service pytest -q
docker compose exec site-service pytest -q
docker compose exec api-gateway pytest -q

Run the end-to-end test:

docker compose exec profile-service pytest -q tests/integration/test_end_to_end.py

The E2E test checks:

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
Git Workflow

Development is performed in feature branches.

Backend integration is performed in:

Backend-MVP-test

Changes must reach main only through a Pull Request after tests and review.
