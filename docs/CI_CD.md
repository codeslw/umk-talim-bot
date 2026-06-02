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
- `DEPLOY_SSH_PASSPHRASE` if the private key is passphrase protected. Leave it unset when using a deploy key without a passphrase.
- `GHCR_USERNAME`
- `GHCR_TOKEN`

Do not commit env files. Use the variable names above and add values directly in GitHub repository secrets.

SSH key note: GitHub Actions cannot prompt for a passphrase. Either add `DEPLOY_SSH_PASSPHRASE` as a repository secret or create a dedicated server deploy key without a passphrase and restrict that key on the server.

On the server:

1. Install Docker and Docker Compose.
2. Run the `Deploy` workflow manually once from GitHub Actions. If the deploy directory does not exist, the workflow creates it.
3. On the first run, the workflow creates `.env.production` with placeholder values and stops.
4. SSH into the server, edit `${DEPLOY_PATH}/.env.production`, and replace every `CHANGE_ME` value.
5. Run the `Deploy` workflow again.

The deploy workflow copies `deploy/docker-compose.prod.yml` and `deploy/nginx/default.conf` to the server automatically. Nginx listens on `${HTTP_PORT:-80}` and proxies to the app container. Database migrations run before the app is restarted.

For HTTPS, put a TLS terminator in front of this nginx service or extend `deploy/nginx/default.conf` with certificates mounted from the host.
