# Helpdesk Web — Claude Code context

> Se carga solo en cada sesión de Claude Code dentro de este repo. Es el handoff
> durable del frontend. El backend tiene el suyo en `helpdesk-api/CLAUDE.md`, y
> ahí vive el plan de fases y los ADRs (que mandan también sobre este repo).

## Qué es

Frontend del SaaS de **helpdesk multi-tenant y event-driven**. Proyecto de
portfolio fullstack senior con **foco backend**: lo primero es consumir bien un
backend event-driven y no contradecir sus decisiones.

Dicho eso, **la interfaz sí importa**, y desde 2026-09-10 tiene un lenguaje
visual propio (ver "Capa de UI"): este es el único de los dos repos que es
público, o sea el único que un reclutador puede abrir. Lo que NO cambió es la
regla de fondo: **no se inventa nada que la API no diga** — sin nombres de
usuario falsos, sin barras de progreso deducidas, sin estados adivinados.

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

**Fases 1, 2, 4, 6 y 7 (cliente) — CERRADAS.** El frontend ya se usa de punta a
punta: entrar, abrir un ticket, conversarlo, operarlo como agente y configurar el
SLA, con la pantalla actualizándose sola por WebSocket.

**Fase 2 (auth).** Login por `organizationSlug` + email + password, y registro
self-service en la misma pantalla.
- El **access token vive solo en memoria** (`auth-store`), así que cada recarga
  empieza sin él. `SessionProvider` arranca canjeando la cookie httpOnly del
  refresh: si funciona había sesión, si no el usuario es anónimo. De ahí el
  estado `loading` — pintar el login mientras tanto haría parpadear la pantalla
  a cualquiera que recargue estando dentro.
- `status` se **deriva** del store, no se sincroniza con un efecto: con dos
  estados en paralelo, cualquier cosa que limpiara la sesión (un `unauthorized`
  del socket, un logout) dejaría al provider diciendo que sigue habiendo sesión.
- **La guarda de ruta es de cliente, no un middleware.** El refresh está en una
  cookie con `Path=/auth` que el navegador no manda al front, así que un
  middleware en el servidor de Next no tendría con qué decidir. La guarda de
  verdad la aplica la API en cada petición; esto solo evita pantallas vacías.

**Fase 4 (tickets).** Bandeja con filtro por estado y paginación **por cursor**
(`useInfiniteQuery`), detalle con conversación, abrir ticket, comentar, y para
AGENT/ADMIN cambiar estado y asignar.
- Solo se ofrecen las **transiciones legales** (ADR-0015 replicado en
  `lib/api/types.ts`). Es UX: el backend responde 409 igual.
- **No hay selector de personas para asignar**: el backend no expone ningún
  endpoint para listar los miembros de la organización, y `assign` pide un UUID.
  Se resolvió con "Asignármelo" + "Quitar asignación", que cubre el flujo real
  de un agente sin inventar un endpoint que no existe. Si algún día aparece un
  `GET /members`, ahí entra el selector.
- Las mutaciones invalidan igual que lo haría el WebSocket, a propósito: el
  evento llega por el outbox unos milisegundos después y solo si el socket está
  vivo. Esperarlo dejaría al usuario mirando su propio cambio sin efecto.

**Fase 6 (SLA).** Panel de relojes en el detalle y pantalla `/settings/sla`.
- El margen de un reloj parado **se pinta tal como llega**; calcularlo contra
  `Date.now()` haría que un ticket resuelto la semana pasada empeorase cada vez
  que alguien abre la pantalla.
- Un reloj vencido que el barrido aún no marcó se muestra como "vencido, sin
  registrar": ni se miente diciendo que va bien, ni se adelanta al backend.
- La configuración se edita **una prioridad a la vez**, como la expone la API.
  `source` distingue lo pactado de lo de fábrica — sin eso no se sabe si tocar
  un valor rompe un acuerdo.
- La regla "no podés prometer resolver antes que responder" NO se duplica aquí:
  vive en el dominio del backend y se muestra el error tal como llega.

**Fase 7 (cliente de tiempo real) — CERRADA.**
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
- `lib/query/keys.ts` — claves canónicas, compartidas por queries y realtime.

**Tests (Vitest + Testing Library).** 50 tests junto al código (`*.test.ts[x]`),
sobre lo que tiene lógica de verdad y no sobre el marcado:
- `lib/api/client.test.ts` — el token se lee en CADA llamada (si se capturara al
  importar, todo daría 401 tras el primer refresh), `credentials: 'include'`
  siempre, y el `code` del RFC 7807 conservado (mapear por texto sería atarse a
  la redacción).
- `providers/ws-provider.test.tsx` — el orquestador: no conecta sin sesión,
  reconecta al cambiar el token, `token_expired` refresca y `unauthorized` no
  insiste, un comentario invalida SOLO su detalle, y al reconectar cierra el
  hueco y vuelve a las salas. Se dobla la fábrica del socket, no socket.io.
- `lib/realtime/use-ticket-watch.test.tsx` — el recuento de suscriptores: dos
  componentes mirando el mismo ticket se suscriben una vez, y el primero en
  cerrarse no deja al otro sin avisos.
- `features/auth/session.test.tsx` — arranque en `loading`, recuperación por
  refresh, y que perder el token deje la sesión anónima sola (prueba de que el
  estado se DERIVA y no se sincroniza).
- `features/tickets/components/sla-panel.test.tsx` — los tres estados del reloj,
  incluido el vencido que el barrido aún no marcó.

**Verificado:** `pnpm test` (36), `pnpm typecheck`, `pnpm lint` y `pnpm build` en
verde, y
los contratos comprobados contra la API real con curl (registro, me, tickets,
comentarios, transición inválida, sla-policy y refresh).

## Gotchas

- **`enableCors()` del backend rompía todo esto y ningún test lo veía.** Devolvía
  `Access-Control-Allow-Origin: *` sin credenciales, y el navegador descarta esa
  respuesta cuando la petición lleva `credentials: 'include'`. Arreglado en el
  backend (`CORS_ORIGINS`, commit `dc25055`). Si el front deja de hablar con la
  API, mirar ahí antes que aquí.
- La regla de ESLint `react-hooks/set-state-in-effect` es un error, no un aviso:
  si hace falta llamar a `setState` en el cuerpo de un efecto, casi siempre el
  estado se puede **derivar** en su lugar. Pasó dos veces en esta sesión.
- Back y front usan el 3000 por defecto: levantar el front en otro puerto
  (`PORT=3001 pnpm dev`) y que coincida con `CORS_ORIGINS` del backend.

## OJO: qué falta

- El cliente REST sigue escrito a mano (`apiFetch`); el cliente tipado generado
  desde el OpenAPI (ADR-0004) está pendiente, y con él los tipos de
  `lib/api/types.ts` dejarían de mantenerse a ojo.
- El contrato del WebSocket (`lib/realtime/events.ts`) seguirá a mano igual: los
  eventos de Socket.io no están en el OpenAPI.
- `/auth/me` no devuelve el email, así que tras recuperar la sesión con el
  refresh el usuario queda con el email vacío. Se rellena al hacer login.
- No hay pantalla de invitación de miembros ni de gestión de roles (el backend
  tampoco los expone).
- El rastro de auditoría (`GET /tickets/:id/history`) tiene su hook
  (`useTicketHistory`) pero ninguna pantalla lo usa todavía.

## Capa de UI (2026-09-10)

Lenguaje visual tomado del **Atlassian Design System**, a pedido del usuario.
Sin dependencias nuevas: `@base-ui/react` ya estaba y trae `toast`, `tooltip`,
`dialog` y `menu`.

- **`globals.css`** — paleta de ADS en hex, con el nombre del token al lado
  (`#172B4D` = N800, `#0C66E4` = B400). Dos cosas que no hay que "arreglar":
  el texto **no es negro** sino azul-tinta, y el radio es de 4px porque
  Atlassian es cuadrado. Tokens nuevos `--success` / `--warning` / `--info` /
  `--danger` y los de cromo `--shell-*`: antes los badges tiraban de
  `emerald-500` y `amber-500` crudos, que no responden al tema.
- **Tema claro/oscuro a mano** (`providers/theme-provider.tsx` + `lib/theme.ts`).
  Sin `next-themes`. Dos detalles que cuestan si se tocan: el script síncrono
  del `<head>` (`guionAntiParpadeo`) evita el fogonazo blanco, y la preferencia
  se lee con `useSyncExternalStore`, no con un `setState` en un efecto, que la
  regla `react-hooks/set-state-in-effect` prohíbe.
- **Marco** (`(app)/layout.tsx`) — barra superior fija + navegación lateral, que
  en móvil pasa a panel. El panel se cierra en el `onClick` de cada enlace, no
  con un efecto sobre el pathname (misma regla de ESLint).
- **Bandeja** — anatomía de backlog: flecha de prioridad, `#número` en mono,
  asunto, asignación, lozenge de estado y tiempo relativo. Bajo `sm` los
  metadatos caen a una segunda línea en vez de comprimir el asunto.
- **Detalle** — vista de incidencia a dos columnas: a la izquierda lo que se lee,
  a la derecha lo que se opera. El **estado es un menú de transiciones legales**
  (ADR-0015), que es donde ese cálculo se luce.
- **Avisos** (`components/ui/toast.tsx`) — las mutaciones confirman. El error va
  con `priority: 'high'` y sin cierre automático: un fallo que se desvanece solo
  es un fallo que nadie leyó.
- **`cambiosRecientes` en `ws-provider`** — lo que llega por el socket sigue sin
  pintarse (solo invalida), pero ahora se anota QUÉ ticket cambió para que la
  fila dé un destello. Un cambio que ocurre donde nadie mira, se pierde.
- **Sin barra de progreso en el SLA**, a propósito: dibujar lo consumido exige
  saber cuándo arrancó el reloj, y el DTO no lo trae. Deducirlo de
  `dueAt - createdAt` se rompe en cuanto un reloj se pause.

### Gotcha que costó el build

**Por la frontera servidor/cliente solo cruzan componentes con nombre.**
`providers/index.tsx` NO lleva `'use client'`, así que es un componente de
servidor. Reexportar el *namespace* `TooltipPrimitive` desde un módulo de cliente
lo convirtió en una referencia opaca, y `TooltipPrimitive.Provider` llegó como
`undefined`: "Element type is invalid" en TODAS las rutas, aunque el build solo
señalaba `/settings/sla` (falla en la primera que prerenderiza). La salida es
exportar un `TooltipProvider` propio.

## Comandos

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL apunta al backend
pnpm dev                     # ojo: back y front usan 3000, mover uno
pnpm lint
pnpm typecheck
pnpm test                    # vitest run
pnpm test:watch
pnpm build
```

**Entorno:** `pnpm` no está en el PATH — usar `corepack pnpm`. Git en este repo
(sobre OneDrive) es lento: usar timeouts largos, y **commitear pronto y a menudo**
(una sincronización de OneDrive ya revirtió trabajo sin commitear en el backend).

## Metodología

Igual que en el backend: proponer estructura y decisiones, **esperar OK antes de
generar código**, documentar el porqué, y responder siempre en **español**.

## Fase 10 (docs) — 2026-09-10

- **README reescrito en INGLES** (decision del usuario: el README es el
  escaparate y lo leen hiring managers; los ADRs del api siguen en espanol).
  Cubre las decisiones propias del cliente: token en memoria, por que la guarda
  de ruta es de CLIENTE y no middleware, invalidar cache en vez de pintar el
  payload, socket atado al ciclo de vida del token. Y su deuda conocida.
- **`LICENSE` (MIT)** anadido; no habia.
- **`Dockerfile`: `NEXT_PUBLIC_API_URL` pasa a ser `ARG`.** Next sustituye las
  `NEXT_PUBLIC_*` ESTATICAMENTE durante el build, asi que el `docker run -e ...`
  que documentaba el README anterior no tenia ningun efecto sobre el bundle que
  llega al navegador. Verificado grepeando el chunk generado.
- Este repo se levanta junto al backend con
  `docker compose -f ../helpdesk-api/infra/docker-compose.demo.yml up --build`
  (web en :3001, api en :3000, con datos de demo ya sembrados).
- Verificado: 36/36 tests, typecheck y build en verde.
