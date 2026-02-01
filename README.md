# Review System API (MVP)

NestJS API for the review system MVP, deployable to AWS Lambda with PostgreSQL.

## Tech stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS
- **Database:** PostgreSQL (TypeORM)
- **Deploy:** AWS Lambda + API Gateway (Serverless Framework)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection string.

3. **Database migrations**

   ```bash
   npm run migration:run
   ```

   Ensure PostgreSQL has the `uuid-ossp` extension (the initial migration creates it if not present).

## Run locally

- **Express (default):**

  ```bash
  npm run start:dev
  ```

  API base: `http://localhost:3000/api`

- **Local Lambda-style (serverless-offline):**

  ```bash
  npm run deploy:dev
  # or
  npx serverless offline
  ```

### Local auth (no API Gateway)

Send headers for user context:

- `x-user-id`: UUID of the traveler or admin
- `x-user-role`: `traveler` or `admin`

Example:

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -H "x-user-id: <traveler-uuid>" \
  -H "x-user-role: traveler" \
  -d '{"provider_id":"<provider-uuid>","rating":5,"review_text":"Great experience with more than twenty characters."}'
```

## GitHub Actions (Build and Deploy)

The workflow `.github/workflows/build-deploy.yml` runs on every push and pull request to `main`:

- **Build and Test:** `npm ci` → `npm run test` → `npm run build` (always runs).
- **Deploy:** Runs only when:
  - Pushing to `main` (deploys to stage `prod`), or
  - Manual run via **Actions → Build and Deploy → Run workflow** (deploys to the chosen stage, default `dev`).

**Required repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `DATABASE_URL` | PostgreSQL connection string for the Lambda environment |

Optional: `AWS_REGION` (default `us-east-1`).

## Deploy to AWS Lambda (manual)

1. Set `DATABASE_URL` (e.g. in AWS Secrets Manager or SSM and reference in `serverless.yml`).
2. If the database is in a VPC, configure `provider.vpc` in `serverless.yml` and ensure Lambda can reach RDS.
3. Deploy:

   ```bash
   npm run build
   npm run deploy
   ```

   For a specific stage:

   ```bash
   npx serverless deploy --stage prod
   ```

## API endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/reviews` | traveler | Create review (one per traveler per provider) |
| PUT | `/api/reviews/:review_id` | traveler | Update own review (within 24h) |
| DELETE | `/api/reviews/:review_id` | traveler | Soft-delete own review |
| GET | `/api/providers/:provider_id/reviews` | any | List reviews for provider (sort, limit, offset) |
| PATCH | `/api/admin/reviews/:review_id` | admin | Moderate review (status, is_verified) |
| GET | `/api/admin/reviews` | admin | List reviews for moderation (filter by status, provider_id, traveler_id) |

Error responses follow `{ code, message, details? }`.

## Scripts

- `npm run build` – Build for production
- `npm run start:dev` – Run Express with watch
- `npm run migration:run` – Run TypeORM migrations
- `npm run migration:revert` – Revert last migration
- `npm run test` – Run tests
- `npm run deploy` – Deploy to AWS (Serverless)
