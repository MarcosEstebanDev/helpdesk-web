# helpdesk-web

The Next.js client for a multi-tenant, event-driven helpdesk: sign-in, ticket
inbox and detail, live updates over WebSockets, and SLA configuration.

The backend, and the architectural write-up this project belongs to, live in
[**helpdesk-api**](https://github.com/MarcosEstebanDev/helpdesk-api) — NestJS,
PostgreSQL with Row-Level Security, transactional outbox, durable SLA timers.
That README is the place to start; this one covers the decisions specific to the
client.

## Run it

The fastest path is the full stack, from the API repository — it brings up
Postgres, Redis, the API and this app, already seeded:

```bash
# with both repos cloned side by side
cd ../helpdesk-api
docker compose -f infra/docker-compose.demo.yml up --build
```

Then <http://localhost:3001>, organisation slug `acme-support`, user
`admin@acme.test`, password `demo-password-123`.

On its own, against an API already running on port 3000:

```bash
pnpm install
cp .env.example .env.local
pnpm dev          # http://localhost:3000 — see the port note below
```

> Both apps default to port 3000. Run one of them elsewhere: `PORT=3001 pnpm dev`
> here, and set `CORS_ORIGINS` in the API to match. The API's default already
> expects the frontend on `http://localhost:3001`.

## Stack

Next.js 16 (App Router, React 19, `standalone` output) · TypeScript strict ·
Tailwind CSS 4 · TanStack Query 5 · Zustand 5 · Zod · Socket.io client ·
Vitest + Testing Library · Node 24 · pnpm 11

## Layout

```
src/
├─ app/             routes (App Router); layout.tsx wraps everything in AppProviders
├─ components/ui/   hand-written primitives
├─ features/        vertical slices: auth, tickets, sla
├─ lib/
│  ├─ api/          HTTP client, refresh handling
│  ├─ env.ts        Zod validation of NEXT_PUBLIC_*
│  ├─ query/        QueryClient factory + canonical cache keys
│  └─ realtime/     socket, event contract, useTicketWatch
├─ providers/       QueryProvider, SessionProvider, WsProvider
└─ stores/          Zustand (auth-store: user + in-memory access token)
```

## Decisions worth reading

### The access token lives in memory, and only there

`localStorage` would survive a refresh, and would also be readable by any script
that manages to run on the page. The access token is kept in the Zustand store —
gone on reload — and the session is re-established at startup by exchanging the
refresh cookie, which is httpOnly and therefore invisible to JavaScript.

### The route guard is client-side, and that is not a shortcut

Next.js middleware would be the natural place, but it cannot work here: the
refresh cookie is scoped to `Path=/auth` on the API's origin, so the browser
never sends it to the frontend server. The middleware would have no way to tell
a signed-in visitor from an anonymous one. The guard runs where the session
actually is.

Session state is **derived** from the store rather than mirrored into local state
by an effect. Next's ESLint config treats `react-hooks/set-state-in-effect` as an
error, which turned out to be good pressure: nearly every case where an effect
wanted to set state was a value that could just be computed.

### Realtime messages invalidate cache — they are never rendered

What arrives over the socket says *what changed*, not what it changed to.
`comment.added` carries a ticket id and no body. The handler invalidates the
matching TanStack Query key and the screen refetches through the normal
authorised endpoint.

Rendering the payload directly would mean re-implementing, in the browser, the
role filtering the backend already does — and getting it subtly wrong the first
time a new event type is added. It also makes duplicate delivery a non-issue:
messages are at-least-once, and invalidating twice costs nothing, whereas
accumulating state from a duplicated event corrupts it.

`lib/query/keys.ts` was written before the screens that use it. Canonical keys
defined up front are what let the realtime layer invalidate something the
features will genuinely read.

### The socket is tied to the token's lifetime

No token, no socket. Refreshing the token reconnects. The token goes in the
Socket.io handshake `auth` field, never the query string, where it would land in
proxy and server logs.

A close initiated by the *server* is distinguished from a dropped network: a
`token_expired` reason triggers a refresh and a reconnect, `unauthorized` stops
trying. On reconnect the client invalidates everything ticket-related — messages
sent while it was away are gone, and there is no replay — and rejoins the rooms
it was watching.

`useTicketWatch(ticketId)` counts subscribers, so two components looking at the
same ticket join once and leave when the last one unmounts.

## Tests

```bash
pnpm test        # 36 tests, Vitest + Testing Library + jsdom
pnpm typecheck
pnpm lint
```

Tests sit next to the code and cover what decides something, not markup: the API
client (token read on *every* call, `credentials: 'include'`, RFC 7807 `code`
extraction), the socket lifecycle (no connection without a session, reconnect on
token change, `token_expired` vs `unauthorized`, `comment.added` invalidating only
its own detail, rejoining rooms after a reconnect), the watch refcount, session
bootstrap, and the three states of an SLA clock.

Writing them sharpened two things in the code:

- On mount, a child's effects run before the provider's, so the first `watch`
  finds no socket. That is why the `connect` handler re-sends the pending
  subscriptions — the test made the ordering explicit instead of incidental.
- Unmounting the whole tree does **not** need `unwatch`: closing the socket
  releases its rooms. `unwatch` only matters while the provider stays alive.

## Known debt

- **WebSocket message types are maintained by hand.** The REST contract comes
  from the API's OpenAPI spec, but socket events are not in it, so a change on
  the backend does not break the build here.
- **The typed OpenAPI client is not generated yet.** `lib/api/client.ts` keeps a
  stable interface so that switching to a generated client stays a contained
  change.
- **No audit-trail screen.** `useTicketHistory` exists and is unused; the backend
  serves `GET /tickets/:id/history`.
- **No person picker when assigning.** The API has no `GET /members` endpoint, so
  the UI offers "assign to me" and "unassign" instead.

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:3000 -t helpdesk-web .
docker run -p 3001:3000 helpdesk-web
```

The API URL is a **build argument**, not a runtime variable. Next.js substitutes
`NEXT_PUBLIC_*` statically during the build, so passing it with `-e` at `docker
run` time has no effect on the bundle the browser receives.

## License

MIT — see [LICENSE](LICENSE).
