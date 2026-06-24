# Auth Service

Auth Service — микросервис авторизации для проекта ProfileForge.

Сервис отвечает за регистрацию пользователей, логин, выдачу JWT access token, получение текущего пользователя по Bearer token и публикацию события `user.registered` через Transactional Outbox Pattern.

## Стек

* Python 3.12
* FastAPI
* Uvicorn
* SQLAlchemy
* Alembic
* SQLite
* RabbitMQ
* aio-pika
* pytest
* Docker / Docker Compose

## Endpoints

### GET /health

Проверяет, что сервис запущен.

Пример ответа:

```json
{
  "status": "ok",
  "service": "auth-service"
}
```

### GET /ready

Проверяет, что сервис готов работать и подключение к базе данных доступно.

Пример ответа:

```json
{
  "status": "ready",
  "service": "auth-service",
  "db": "ok"
}
```

### POST /auth/register

Регистрирует нового пользователя.

Пример запроса:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

После успешной регистрации сервис:

* создаёт пользователя в таблице `users`;
* хеширует пароль;
* создаёт событие `user.registered` в таблице `outbox_events`.

### POST /auth/login

Авторизует пользователя и возвращает JWT access token.

Пример запроса:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

### GET /auth/me

Возвращает текущего пользователя по JWT token.

Нужен заголовок:

```http
Authorization: Bearer <access_token>
```

## RabbitMQ events

Auth Service публикует событие:

```text
user.registered
```

Producer:

```text
auth-service
```

Payload:

```json
{
  "user_id": "uuid",
  "email": "user@example.com"
}
```

Событие публикуется через Transactional Outbox Pattern:

1. пользователь создаётся в базе данных;
2. в этой же транзакции создаётся запись в `outbox_events`;
3. `auth-worker` читает pending-события;
4. `auth-worker` публикует событие в RabbitMQ;
5. после успешной публикации статус события меняется на `published`.

## Alembic

Показать текущую миграцию:

```bash
alembic -c alembic.ini current
```

Показать последнюю доступную миграцию:

```bash
alembic -c alembic.ini heads
```

Применить миграции на новой базе:

```bash
alembic -c alembic.ini upgrade head
```

Текущая миграция:

```text
0001_create_auth_tables
```

## Запуск через Docker Compose

Из папки `backend/infra`:

```bash
docker compose up --build
```

Auth Service будет доступен по адресу:

```text
http://localhost:8001
```

Swagger UI:

```text
http://localhost:8001/docs
```

RabbitMQ Management UI:

```text
http://localhost:15672
```

## Проверка вручную

Health:

```powershell
Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get
```

Ready:

```powershell
Invoke-RestMethod -Uri "http://localhost:8001/ready" -Method Get
```

Регистрация:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8001/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"12345678"}'
```

Логин:

```powershell
$response = Invoke-RestMethod `import
  -Uri "http://localhost:8001/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"test@example.com","password":"12345678"}'

$response.access_token
```

Получение текущего пользователя:

```powershell
$token = $response.access_token

Invoke-RestMethod `
  -Uri "http://localhost:8001/auth/me" `
  -Method Get `
  -Headers @{ Authorization = "Bearer $token" }
```

```markdown
Проверка outbox events:

```powershell
docker compose exec auth-service python -c "import sqlite3; con = sqlite3.connect('/data/auth.db'); print(con.execute('SELECT event_type, status, retry_count, published_at, last_error FROM outbox_events ORDER BY created_at DESC LIMIT 5').fetchall())"

## Тесты

Запуск тестов из папки `backend/infra`:

```bash
docker compose exec auth-service pytest -q
```

Ожидаемый результат:

```text
passed
```

## Структура сервиса

```text
auth-service/
  app/
    api/
    core/
    db/
    models/
    schemas/
    services/
    main.py
    worker.py
  alembic/
    versions/
      0001_create_auth_tables.py
  tests/
    test_auth_api.py
  Dockerfile
  requirements.txt
  alembic.ini
  README.md
```

## Статус

Готово:

* регистрация пользователя;
* логин пользователя;
* JWT access token;
* получение текущего пользователя;
* SQLite
* RabbitMQ;
* Transactional Outbox Pattern;
* auth-worker;
* Alembic migration;
* тесты Auth Service.
