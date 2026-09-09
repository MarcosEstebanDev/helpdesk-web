# Helpdesk Web — Claude Code context

> Se carga solo en cada sesión de Claude Code dentro de este repo. Es el handoff
> durable del frontend. El backend tiene el suyo en `helpdesk-api/CLAUDE.md`, y
> ahí vive el plan de fases y los ADRs (que mandan también sobre este repo).

## Qué es

Frontend del SaaS de **helpdesk multi-tenant y event-driven**. Proyecto de
portfolio fullstack senior con **foco backend**: aquí el objetivo no es lucir UI,
sino consumir bien un backend event-driven y no contradecir sus decisiones.

- Repo backend (separado, ADR-0001): `helpdesk-api` — **PRIVADO**.
- **Este repo es PÚBLICO**: https://github.com/MarcosEstebanDev/helpdesk-web
  Ojo con lo que se commitea.

## Stack

Next.js 16 (App Router, React 19) · TypeScript estricto · Tailwind 4 + shadcn/ui ·
TanStack Query 5 · Zustand 5 · Zod (env) · socket.io-client 4.8 (fijado a la misma
línea que el servidor). Node 24, pnpm 11.

## Reglas que vienen del backend

- **El `tenantId` no se manda nunca.** Sale del JWT, en HTTP y en el WebSocket.
  Si algún día hace falta enviarlo desde el cliente, está mal planteado.
- **El backend re-valida todos los permisos.** Lo que hay aquí (roles en el
  store) es gating de UX, no seguridad.
- **El access token vive SOLO en memoria** (`auth-store`). Nunca en
  `localStorage` ni en cookie legible por JS. El refresh va en cookie httpOnly
  (`Path=/auth`) y no se toca desde JS.
- Errores de la API en formato RFC 7807 (`application/problem+json`) con un
  `code` estable: mapear por `code`, no por el texto del mensaje.

## Estado actual (2026-09-09)

**Fase 1 (scaffold) — CERRADA.** Commit `e34dcba`.

**Fase 7 (cliente de tiempo real) — CERRADA.** Lo único de este repo que va por
delante de la fase 1, porque el backend ya tenía el gateway listo.

- `lib/realtime/events.ts` — contrato de los mensajes, **mantenido a mano**.
- `lib/realtime/socket.ts` — token en el handshake (`auth`), nunca en la query
  string; solo transporte websocket; reconexión automática para cortes de red.
- `providers/ws-provider.tsx` — conecta atado al access token, distingue el
  cierre del SERVIDOR (`disconnected`) de un corte de red, refresca el token en
  `token_expired` y no reintenta en `unauthorized`. **Invalida caché; no pinta.**
  Al reconectar invalida todo lo de tickets (el hueco en que estuvo caído no se
  recupera) y vuelve a entrar en las salas que estaba siguiendo.
- `lib/realtime/use-ticket-watch.ts` — sigue un ticket mientras el componente
  esté montado, con recuento por si dos componentes miran el mismo.
- `lib/query/keys.ts` — claves canónicas. Existen antes que las pantallas a
  propósito: si cada feature se inventa las suyas, el realtime invalida algo que
  nadie lee y la pantalla se queda quieta sin que falle nada.
- `lib/api/refresh.ts` — lo mínimo de sesión que el socket necesita para
  sobrevivir a una expiración. **No es el login**, que es otra fase.
- **Verificado:** `tsc --noEmit`, `pnpm lint` y `pnpm build` en verde.

## OJO: este repo va MUY por detrás del backend

El backend tiene 7 fases cerradas; aquí solo están la 1 y el cliente de la 7.
**No hay login, ni pantallas, ni un solo hook de datos.** En concreto faltan:

- **Fase 2 (auth):** login por `organizationSlug` + email + password, arranque de
  sesión con `/auth/refresh` al cargar, guardas de ruta. El store ya tiene sitio
  para el usuario y el token.
- **Fase 4 (tickets):** lista paginada **por cursor** (no por offset), detalle con
  conversación, abrir ticket, comentar, y para AGENT asignar y cambiar estado.
  Usar `ticketKeys` — el realtime ya invalida esas claves.
- **Fase 6 (SLA):** el detalle del ticket trae `sla[]` con `status` y
  `remainingMinutes`; pantalla de configuración en `/sla-policy` (solo ADMIN).
- **Tests: no hay runner configurado.** El backend escribe tests junto al código
  y aquí no hay ni Vitest ni Testing Library. Es la carencia más visible del repo.

## Deuda conocida

- El contrato del WebSocket se mantiene a ojo: los eventos de Socket.io no están
  en el OpenAPI (ADR-0004 cubre solo REST). Un cambio en `BroadcastTicketEvent`
  del backend no rompe la compilación aquí.
- El cliente REST sigue siendo `apiFetch` a mano; el cliente tipado generado
  desde el OpenAPI está pendiente.
- `apiFetch` no adjunta el access token todavía (no había sesión que adjuntar).
  Al hacer la fase 2, ese es el sitio.

## Comandos

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL apunta al backend
pnpm dev                     # ojo: back y front usan 3000, mover uno
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

**Entorno:** `pnpm` no está en el PATH — usar `corepack pnpm`. Git en este repo
(sobre OneDrive) es lento: usar timeouts largos, y **commitear pronto y a menudo**
(una sincronización de OneDrive ya revirtió trabajo sin commitear en el backend).

## Metodología

Igual que en el backend: proponer estructura y decisiones, **esperar OK antes de
generar código**, documentar el porqué, y responder siempre en **español**.
