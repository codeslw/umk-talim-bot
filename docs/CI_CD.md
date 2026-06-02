# CI/CD

This project uses GitHub Actions for CI and Docker Compose for production deployment.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main` or `master`.

- Backend: installs dependencies, generates Prisma client, validates migrations against PostgreSQL, typechecks, and runs Jest.
- Frontend: typechecks and builds the Vite React admin app.
- Docker: validates the production Docker image build.

## Production Deploy

`.github/workflows/deploy.yml` builds and pushes a Docker image to GitHub Container Registry, then connects to your server over SSH and restarts Docker Compose.

Required GitHub repository secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PORT`
- `DEPLOY_PATH`
- `DEPLOY_SSH_PRIVATE_KEY`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

Use `deploy/.env.github-secrets.example` as the placeholder source for these values.

On the server:

1. Install Docker and Docker Compose.
2. Create the deploy directory, for example `/opt/umk-talim-bot`.
3. Copy `deploy/.env.production.example` to `/opt/umk-talim-bot/.env.production`.
4. Replace every `CHANGE_ME` value.
5. Run the `Deploy` workflow manually once from GitHub Actions.

The deploy workflow copies `deploy/docker-compose.prod.yml` to the server automatically. Database migrations run before the app is restarted.
