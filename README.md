# helpdesk-web

Frontend del SaaS de **helpdesk multi-tenant y event-driven**. Parte de un
proyecto de portfolio fullstack con foco en **decisiones de arquitectura**.

Backend (repo separado): [`helpdesk-api`](https://github.com/MarcosEstebanDev/helpdesk-api)
— NestJS, arquitectura hexagonal, Postgres con Row-Level Security.

## Stack

- **Next.js 16** (App Router, React 19, modo `standalone` para Docker).
- **TypeScript** estricto.
- **Tailwind CSS 4** + **shadcn/ui** (base color neutral, iconos lucide).
- **TanStack Query 5** para estado de servidor (caché, refetch, devtools).
- **Zustand 5** para estado de cliente (UI/sesión no sensible).
- **Zod** para validar variables de entorno públicas.
- Tooling: Node 24, pnpm 11.

## Estructura

```
src/
├─ app/             # rutas (App Router). layout.tsx envuelve con AppProviders
├─ components/ui/   # componentes shadcn/ui
├─ features/        # vertical slices por bounded context (api/hooks/components/store)
├─ lib/
│  ├─ api/client.ts # cliente HTTP tipado (baseURL, cookies, errores)
│  ├─ env.ts        # validación Zod de NEXT_PUBLIC_*
│  ├─ query/        # factory de QueryClient + claves canónicas (keys.ts)
│  ├─ realtime/     # socket, contrato de eventos y useTicketWatch
│  └─ utils.ts      # cn() de shadcn
├─ providers/       # QueryProvider, WsProvider (realtime), AppProviders
└─ stores/          # stores Zustand (auth-store: usuario + access token en memoria)
```

**Decisión:** el frontend consume el backend vía su contrato **OpenAPI**
(ADR-0004 en `helpdesk-api`); en fases posteriores se genera un cliente tipado
desde ese spec, manteniendo estable el contrato de `lib/api/client.ts`.

## Tiempo real

La conexión de Socket.io vive en `WsProvider` (ADR-0022 y ADR-0023 del backend):

- Se conecta con el access token en el handshake y se ata a él: sin token no hay
  socket, y refrescarlo reconecta. El socket nunca sobrevive a su credencial.
- **Lo que llega no se pinta: invalida caché de TanStack Query.** Los mensajes
  traen lo justo para saber qué cambió — `comment.added` ni siquiera trae el
  cuerpo — y la pantalla se actualiza al recargar con los permisos del usuario.
- Los mensajes son **at-least-once**: pueden llegar repetidos. Invalidar dos
  veces es inofensivo; acumular estado a partir de los eventos no lo sería.
- `useTicketWatch(ticketId)` entra en la sala de un ticket mientras el
  componente esté montado. Sin eso, el detalle no recibe sus avisos.

⚠️ El contrato de los mensajes (`lib/realtime/events.ts`) **se mantiene a mano**:
los eventos de WebSocket no están en el OpenAPI, así que un cambio en el backend
no rompe la compilación aquí. Es deuda conocida.

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # ajustar NEXT_PUBLIC_API_URL si hace falta
pnpm dev                     # http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test                    # Vitest + Testing Library
pnpm build                   # genera .next/standalone
```

Los tests viven **junto al código** (`*.test.ts[x]`) y cubren lo que tiene
lógica: el ciclo de vida del socket, el recuento de suscripciones a un ticket, el
arranque de sesión y el cálculo de márgenes de SLA. El marcado no se testea.

> Nota: tanto el front como el back usan el puerto 3000 por defecto. Para
> correr ambos en local, levantar uno en otro puerto (ej. `PORT=3001 pnpm dev`).

## Docker

```bash
docker build -t helpdesk-web .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:3001 helpdesk-web
```
