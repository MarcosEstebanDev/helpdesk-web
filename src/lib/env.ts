import { z } from 'zod';

/**
 * Validación de las variables públicas del cliente. Mismo principio que el
 * backend (`helpdesk-api` valida su env con Zod y falla temprano): tipado y
 * sin sorpresas en runtime. Solo las `NEXT_PUBLIC_*` llegan al browser.
 *
 * Se referencian de forma explícita (no `process.env[clave]`) para que el
 * bundler de Next las reemplace estáticamente en build.
 */
const clientEnvSchema = z.object({
  /** URL pública de la API. La usa siempre el socket de tiempo real. */
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  /**
   * Base de las llamadas HTTP cuando el front sirve la API detrás de su propio
   * proxy (`/api`, ADR-0035). Sin ella, HTTP va directo a `NEXT_PUBLIC_API_URL`.
   */
  NEXT_PUBLIC_API_BASE: z
    .string()
    .regex(/^\/[\w-]+$/, 'Debe ser un path como /api')
    .optional(),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || undefined,
});

/**
 * Dónde van las llamadas HTTP.
 *
 * Con proxy, al MISMO origen que la página: así la cookie httpOnly del refresh
 * es de primera parte y sobrevive a recargar aunque web y API vivan en
 * dominios de la Public Suffix List (`*.up.railway.app`), donde una cookie
 * `SameSite=Lax` entre los dos no viaja nunca.
 *
 * El socket NO pasa por acá: se autentica con el access token en el handshake
 * (ADR-0022), no con la cookie, así que no gana nada atravesando el proxy.
 */
export function apiHttpBase(
  env: Pick<
    z.infer<typeof clientEnvSchema>,
    'NEXT_PUBLIC_API_URL' | 'NEXT_PUBLIC_API_BASE'
  > = clientEnv,
): string {
  return env.NEXT_PUBLIC_API_BASE ?? env.NEXT_PUBLIC_API_URL;
}
