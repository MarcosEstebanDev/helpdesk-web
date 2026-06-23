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
│  ├─ query/        # factory de QueryClient
│  └─ utils.ts      # cn() de shadcn
├─ providers/       # QueryProvider, WsProvider (placeholder Fase 7), AppProviders
└─ stores/          # stores Zustand (auth-store placeholder)
```

**Decisión:** el frontend consume el backend vía su contrato **OpenAPI**
(ADR-0004 en `helpdesk-api`); en fases posteriores se genera un cliente tipado
desde ese spec, manteniendo estable el contrato de `lib/api/client.ts`.

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # ajustar NEXT_PUBLIC_API_URL si hace falta
pnpm dev                     # http://localhost:3000
pnpm lint
pnpm build                   # genera .next/standalone
```

> Nota: tanto el front como el back usan el puerto 3000 por defecto. Para
> correr ambos en local, levantar uno en otro puerto (ej. `PORT=3001 pnpm dev`).

## Docker

```bash
docker build -t helpdesk-web .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:3001 helpdesk-web
```
