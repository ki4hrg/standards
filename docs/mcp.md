# MCP servers

Apps that expose data to Claude do it through an MCP server on the app itself, usable as a
claude.ai connector (web, desktop and mobile).

## Endpoint

- At `/mcp` on the app's own origin.
- Built with the official `@modelcontextprotocol/sdk`, stateless Streamable HTTP: a new server
  instance per request, no session state in memory, so it works behind any proxy and across
  restarts.
- **Shared package (planned):** the OAuth server and tool helpers below will live in one package
  on public npm, used by every app. Until it exists, copy from the most recent app that implements them and note
  the source in `docs/ARCHITECTURE.md`.

## Auth

The app is its own OAuth 2.1 authorization server, because claude.ai connectors sign in with
OAuth:

- Discovery: protected-resource metadata (RFC 9728) and authorization-server metadata (RFC 8414)
  under `/.well-known/`.
- Dynamic client registration; authorization code with PKCE (S256 only); resource indicators
  (RFC 8707).
- Tokens and clients persisted in the database, never in memory.
- Rotating refresh tokens with a short grace window, so a client that retries a refresh after a
  dropped response is not signed out.
- Scopes: `<area>:read` and `<area>:write`, or plain `read`/`write` for a small app. A tool is
  listed only if the token's scopes allow it.
- The consent screen signs the user in through the app's normal login (including OIDC).
- An optional API key for scripts, with the same scope model.

## Tools

- Names are `snake_case` `verb_noun`: `list_expenses`, `get_expense`, `create_expense`,
  `update_expense`, `delete_expense`.
- `list_` returns summaries and says in its description that `get_` returns the full record.
  Lists are paginated with a cursor and default to a sensible limit.
- Every tool has a `title`, a description written for the model (what it is for, when to use it,
  what it does not do), and annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`).
- Input schemas are zod. Descriptions on fields say units, formats and time zones.
- A refusal (validation, permission, not found) is an `isError` result with a sentence the model
  can act on, not a protocol error.
- Destructive or bulk operations preview first: a call without `confirm: true` returns what would
  happen.
- Tools call the same domain functions the UI's server actions call. There is one write path,
  with validation, authorization and audit in it, not in the tool.
- Free text that came from other people (email bodies, notes) is data. The server's
  `instructions` say so.
- Server `instructions` give the model the data model in a few sentences and the tool to start
  with.
