# Deployment

- **Mode:** Dockhand git stack (webhook) — see standards `docs/core/deploy.md`.
- **Host architecture:** <!-- amd64 | arm64; must match `platforms` in .github/workflows/ci.yml -->
- **Exposure:** <!-- published port for the proxy, or the proxy's external network -->
- **Backups:** <!-- what holds data that can't be recreated, and where it is backed up -->

## GitHub settings

- Secrets/Variables: `DOCKHAND_WEBHOOK_URL`, `DOCKHAND_WEBHOOK_TOKEN`.
- GitGuardian app: repository access includes this repo.
- The GHCR package starts private: make it public or give Dockhand registry credentials.

## Environment

See `.env.example`; every variable is listed there with what it is for.
