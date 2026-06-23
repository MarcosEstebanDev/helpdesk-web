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
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
