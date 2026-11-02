# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

Raised by a migration sweep's close-out (2026-11-02). Each has a recommendation.

1. **Reverse proxy on another machine** (`core/deploy.md`, network exposure). The rule says to
   bind the published port to the interface the proxy connects on; with the proxy on another
   host, that is a LAN interface anyone on the LAN can reach. *Recommendation:* allow it when
   `trustProxy` names only the proxy's address (that alone stops a spoofed `X-Forwarded-For`)
   and the host firewall admits the port only from the proxy (that stops requests that skip the
   proxy's TLS and limits). Record both in `docs/DEPLOYMENT.md`.
2. **Host-level volume backup instead of the `backup` service** (`core/deploy.md`).
   *Recommendation:* acceptable only as a recorded exception, and only when the copy is
   consistent: a filesystem snapshot, or Postgres stopped during the copy. A plain file copy of
   a running database's volume may not restore. Otherwise keep the `pg_dump` service.
3. **Topic docs and spec names** (`core/agent-docs.md`). May `data-model.md`, `import.md` and
   the like sit beside `SPEC.md` and `ARCHITECTURE.md`, and must an existing spec be renamed
   `SPEC.md`? *Recommendation:* allow topic docs that SPEC or ARCHITECTURE links to; keep an
   existing spec's name when CLAUDE.md's layout map points to it.
4. **Screenshots for visual review** (Node service / Next.js profiles). CI uploads Playwright
   output only on failure, so a design review needed Playwright run locally in Docker.
   *Recommendation:* an optional `workflow_dispatch` job in the template that uploads screenshots
   of the main screens in both themes. Low priority.
