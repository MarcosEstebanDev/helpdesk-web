'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { useSession } from '@/features/auth/session';
import { TicketComments } from '@/features/tickets/components/ticket-comments';
import { TicketHistory } from '@/features/tickets/components/ticket-history';
import type { TicketDetail } from '@/lib/api/types';

/**
 * La sección de actividad del ticket: conversación e historial de auditoría.
 *
 * **Un VIEWER no ve la pestaña de historial**, y entonces tampoco ve pestañas:
 * se le pinta la conversación tal cual, como antes de que esto existiera.
 * `GET /tickets/:id/history` pide AGENT, así que ofrecerle una pestaña que
 * responde 403 sería peor que no ofrecerla.
 *
 * El `habilitado` del hook se **deriva en el render** de qué pestaña está
 * abierta, no se sincroniza con un efecto: la regla
 * `react-hooks/set-state-in-effect` de este repo es un error, y acá además no
 * hace falta — el valor de la pestaña ya es estado.
 */
export function TicketActivity({ ticket }: { ticket: TicketDetail }) {
  const { user } = useSession();
  const [pestania, setPestania] = useState('comentarios');

  const esAgente = user?.role === 'AGENT' || user?.role === 'ADMIN';

  if (!esAgente) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">
          Actividad{' '}
          <span className="font-normal text-muted-foreground">
            ({ticket.comments.length})
          </span>
        </h2>
        <TicketComments ticket={ticket} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="sr-only">Actividad del ticket</h2>

      <Tabs valor={pestania} onValorChange={setPestania}>
        <TabsList etiqueta="Actividad del ticket">
          <TabsTab valor="comentarios">
            Comentarios{' '}
            <span className="font-normal text-muted-foreground">
              ({ticket.comments.length})
            </span>
          </TabsTab>
          {/*
            Historial va SIN contador: antes de pedirlo no se sabe cuántas
            entradas hay, y un "(0)" ahí sería mentira.
          */}
          <TabsTab valor="historial">Historial</TabsTab>
        </TabsList>

        {/*
          `keepMounted` no es una optimización: Base UI desmonta el panel
          inactivo por defecto, y el textarea de respuesta vive acá. Sin esto,
          mirar el historial a media respuesta BORRA el borrador.
        */}
        <TabsPanel valor="comentarios" keepMounted>
          <TicketComments ticket={ticket} />
        </TabsPanel>

        <TabsPanel valor="historial">
          <TicketHistory ticket={ticket} habilitado={pestania === 'historial'} />
        </TabsPanel>
      </Tabs>
    </section>
  );
}
