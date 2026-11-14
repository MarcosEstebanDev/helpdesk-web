'use client';

import { Inbox, Plus, Search, Sparkles, UserCheck } from 'lucide-react';
import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  Card,
  ErrorText,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/primitives';
import { useAvisos } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import { AvisoFueraDeHorario } from '@/features/business-hours/components/aviso-fuera-de-horario';
import { crearDirectorio } from '@/features/members/directory';
import { useMembers } from '@/features/members/queries';
import {
  filtrosDeBandeja,
  hayFiltros,
  mensajeBandejaVacia,
  type FiltrosDeBandeja,
} from '@/features/tickets/filters';
import { PestanasDeEstado } from '@/features/tickets/inbox/pestanas-de-estado';
import {
  TablaDeTickets,
  TablaEsqueleto,
} from '@/features/tickets/inbox/tabla-de-tickets';
import { TagFilter } from '@/features/tags/components/tag-filter';
import { ControlesDeVista } from '@/features/views/components/view-controls';
import {
  type EstadoDeBandeja,
  filtrosDeVistaAEstado,
} from '@/features/views/mapping';
import { useViews } from '@/features/views/queries';
import { resolverVista } from '@/features/views/resolve';
import {
  useCreateTicket,
  useTicketCounts,
  useTickets,
} from '@/features/tickets/queries';
import { ApiError } from '@/lib/api/client';
import { useDebounced } from '@/lib/use-debounced';
import { cn } from '@/lib/utils';
import {
  TICKET_PRIORITIES,
  type TicketPriority,
  type TicketStatus,
  type SavedView,
} from '@/lib/api/types';

const PRIORIDAD_TEXTO: Record<TicketPriority, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

/**
 * Bandeja de tickets.
 *
 * Se actualiza sola: el `WsProvider` invalida `ticketKeys.lists()` cuando llega
 * un `ticket.created` o un cambio de estado, así que no hace falta refrescar ni
 * hay ningún `setInterval` sondeando el servidor. Los números de las pestañas
 * cuelgan de la misma clave y se refrescan con ella.
 *
 * Teclado: `j`/`k` recorren las filas y Enter abre la enfocada.
 */
export default function TicketsPage() {
  // `useSearchParams` exige un `Suspense` por encima para que Next pueda
  // prerenderizar el resto de la página.
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
      <BandejaConVista />
    </Suspense>
  );
}

/**
 * Lee `?vista=` y monta la bandeja con esos filtros (ADR-0033 del backend).
 * La `key` por vista vuelve a montar la bandeja al cambiar de vista: así sus
 * filtros arrancan de la vista sin sincronizar estado con un efecto.
 */
function BandejaConVista() {
  const { user } = useSession();
  const esEquipo = user?.role === 'AGENT' || user?.role === 'ADMIN';
  const vistaId = useSearchParams().get('vista');
  const vistas = useViews(esEquipo && vistaId !== null);
  const resuelta = resolverVista(vistaId, esEquipo, vistas);

  if (resuelta.tipo === 'cargando') {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }
  return (
    <Bandeja
      key={resuelta.key}
      vista={resuelta.vista}
      aviso={
        resuelta.tipo === 'perdida'
          ? 'Esa vista ya no existe. Se muestran todos los tickets.'
          : resuelta.tipo === 'error'
            ? 'No se pudo cargar la vista. Se muestran todos los tickets.'
            : null
      }
    />
  );
}

function Bandeja({
  vista,
  aviso,
}: {
  vista: SavedView | null;
  /** Por qué no se aplicó la vista pedida (no existe o no se pudo cargar). */
  aviso: string | null;
}) {
  const { user } = useSession();
  const inicial = vista === null ? null : filtrosDeVistaAEstado(vista.filters);
  const [estado, setEstado] = useState<TicketStatus | ''>(inicial?.estado ?? '');
  const [soloMios, setSoloMios] = useState(inicial?.soloMios ?? false);
  const [soloIaUrgentes, setSoloIaUrgentes] = useState(
    inicial?.soloIaUrgentes ?? false,
  );
  const [etiquetas, setEtiquetas] = useState<string[]>(inicial?.etiquetas ?? []);
  const [texto, setTexto] = useState(inicial?.texto ?? '');
  // La búsqueda viaja recién cuando se deja de escribir (ADR-0032).
  const busqueda = useDebounced(texto, 300);
  const [abriendo, setAbriendo] = useState(false);

  // El filtro existe para los tres roles, pero NO significa lo mismo: un agente
  // quiere lo que le toca (por asignación) y un VIEWER, que es el cliente final
  // y no puede tener nada asignado, quiere lo que abrió (por autoría). La
  // traducción a campos distintos de la API vive en `filtrosDeBandeja`; acá solo
  // cambia la etiqueta, para que el botón diga lo que de verdad hace.
  const esAgente = user?.role === 'AGENT' || user?.role === 'ADMIN';

  const filtros = filtrosDeBandeja({
    estado,
    soloMios,
    miId: user?.id,
    esAgente,
    soloIaUrgentes,
    etiquetas,
    busqueda,
  });
  const estadoActual: EstadoDeBandeja = {
    estado,
    soloMios,
    soloIaUrgentes,
    etiquetas,
    texto,
  };

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTickets(filtros);

  const tickets = data?.pages.flatMap((p) => p.items) ?? [];
  const conteos = useTicketCounts(filtros);
  // Las iniciales del asignado salen del directorio. Solo el equipo lo puede
  // pedir (ADR-0025); comparte clave con el selector de asignación.
  const miembros = useMembers(esAgente);
  const directorio = crearDirectorio(miembros.data?.items);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {vista?.name ?? 'Tickets'}
        </h1>
        <Button className="ml-auto" onClick={() => setAbriendo(true)}>
          <Plus />
          Abrir ticket
        </Button>
      </div>

      <PestanasDeEstado
        actual={estado}
        counts={conteos.data}
        onChange={setEstado}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar… (o #123)"
            aria-label="Buscar tickets"
            maxLength={200}
            className="pl-8"
          />
        </div>

        {/* Conmutador y no una pestaña más: son dos dimensiones ortogonales, y
            el filtro real de un agente es "mis tickets en curso". */}
        <Button
          variant="outline"
          aria-pressed={soloMios}
          onClick={() => setSoloMios((v) => !v)}
          className={cn(
            soloMios && 'border-primary bg-accent text-accent-foreground',
          )}
        >
          <UserCheck />
          {esAgente ? 'Mis tickets' : 'Los que abrí yo'}
        </Button>

        {esAgente ? (
          <TagFilter seleccion={etiquetas} onChange={setEtiquetas} />
        ) : null}

        {/* El valor real del triage para un agente: encontrar el incendio que
            entró como "normal". Solo existe para el equipo (ADR-0027). */}
        {esAgente ? (
          <Button
            variant="outline"
            aria-pressed={soloIaUrgentes}
            onClick={() => setSoloIaUrgentes((v) => !v)}
            className={cn(
              soloIaUrgentes && 'border-primary bg-accent text-accent-foreground',
            )}
          >
            <Sparkles />
            La IA sugiere más urgencia
          </Button>
        ) : null}

        {esAgente ? (
          <div className="ml-auto">
            <ControlesDeVista
              vista={vista}
              estado={estadoActual}
              esAdmin={user?.role === 'ADMIN'}
            />
          </div>
        ) : null}
      </div>

      {aviso !== null ? (
        <p role="status" className="text-sm text-muted-foreground">
          {aviso}
        </p>
      ) : null}

      <Dialog
        abierto={abriendo}
        onAbiertoChange={setAbriendo}
        titulo="Abrir un ticket"
        descripcion="Contá qué pasa. Un agente lo va a tomar desde la bandeja."
      >
        <NuevoTicket onListo={() => setAbriendo(false)} />
      </Dialog>

      {isPending ? (
        <TablaEsqueleto esEquipo={esAgente} />
      ) : isError ? (
        <Card className="p-4">
          <ErrorText>
            {error instanceof ApiError
              ? error.message
              : 'No se pudieron cargar los tickets.'}
          </ErrorText>
        </Card>
      ) : tickets.length === 0 ? (
        <BandejaVacia
          filtros={filtros}
          onVerTodos={() => {
            // "Ver todos" quita TODO lo que filtra: antes la búsqueda y las
            // etiquetas quedaban puestas y el botón parecía no hacer nada.
            setEstado('');
            setSoloMios(false);
            setSoloIaUrgentes(false);
            setEtiquetas([]);
            setTexto('');
          }}
          onAbrir={() => setAbriendo(true)}
        />
      ) : (
        <TablaDeTickets
          tickets={tickets}
          esEquipo={esAgente}
          miId={user?.id}
          directorio={directorio}
        />
      )}

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Una bandeja vacía no significa lo mismo según qué esté filtrando.
 *
 * El caso que importa es el tercero: un agente que activó "mis tickets" y no ve
 * nada no está ante un error ni ante un sistema vacío — no tiene trabajo
 * asignado. Decírselo con esas palabras evita que crea que algo se rompió.
 */
function BandejaVacia({
  filtros,
  onVerTodos,
  onAbrir,
}: {
  filtros: FiltrosDeBandeja;
  onVerTodos: () => void;
  onAbrir: () => void;
}) {
  const filtrada = hayFiltros(filtros);
  const mensaje = mensajeBandejaVacia(filtros);

  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Inbox className="size-8 text-muted-foreground/60" aria-hidden />
      <p className="text-sm text-muted-foreground">{mensaje}</p>
      {filtrada ? (
        <Button variant="outline" size="sm" onClick={onVerTodos}>
          Ver todos
        </Button>
      ) : (
        <Button size="sm" onClick={onAbrir}>
          <Plus />
          Abrir el primero
        </Button>
      )}
    </Card>
  );
}

function NuevoTicket({ onListo }: { onListo: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const avisos = useAvisos();
  const crear = useCreateTicket();
  const { user } = useSession();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crear.mutate(
      { subject: subject.trim(), description: description.trim(), priority },
      {
        onSuccess: (ticket) => {
          avisos.exito(`Ticket #${ticket.number} abierto`);
          onListo();
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Fuera de horario el cliente puede abrirlo igual: queda en cola y
          sabe cuándo lo van a ver (ADR-0034). */}
      <AvisoFueraDeHorario esCliente={user?.role === 'VIEWER'} />

      <div className="space-y-1.5">
        <Label htmlFor="subject">Asunto</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Qué pasa, en una línea"
          maxLength={200}
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué esperabas que pasara y qué pasó en su lugar"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="priority">Prioridad</Label>
        <Select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
        >
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORIDAD_TEXTO[p]}
            </option>
          ))}
        </Select>
      </div>

      <ErrorText>
        {crear.isError
          ? crear.error instanceof ApiError
            ? crear.error.message
            : 'No se pudo abrir el ticket.'
          : null}
      </ErrorText>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Abriendo…' : 'Abrir ticket'}
        </Button>
      </div>
    </form>
  );
}
