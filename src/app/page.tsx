import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Helpdesk</h1>
        <p className="max-w-md text-muted-foreground">
          SaaS de helpdesk multi-tenant y event-driven. Frontend en Next.js
          App Router; backend NestJS con arquitectura hexagonal.
        </p>
      </div>
      <Button disabled>Iniciar sesión (Fase 2)</Button>
    </main>
  );
}
