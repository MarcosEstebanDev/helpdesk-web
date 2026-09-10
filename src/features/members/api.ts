import { apiFetch } from '@/lib/api/client';
import type { MemberList } from '@/lib/api/types';

/**
 * Miembros de la organización.
 *
 * El backend responde 403 a un VIEWER a propósito (ADR-0025), así que quien
 * llame a esto tiene que haber comprobado el rol antes: no es una comprobación
 * de seguridad —esa la hace la API— sino de no pedir lo que se sabe que va a
 * fallar.
 */
export function listMembers(): Promise<MemberList> {
  return apiFetch<MemberList>('/members');
}
