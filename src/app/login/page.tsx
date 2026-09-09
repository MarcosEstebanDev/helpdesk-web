'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import * as authApi from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { Button } from '@/components/ui/button';
import {
  Card,
  ErrorText,
  Input,
  Label,
} from '@/components/ui/primitives';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

type Modo = 'login' | 'register';

/**
 * Entrada a la aplicación.
 *
 * Login y registro comparten pantalla porque el backend ofrece registro
 * self-service (ADR-0011) y separar dos formularios de tres campos en dos rutas
 * no aporta nada.
 *
 * El detalle que salta a la vista: **el login pide el identificador de la
 * organización**. No es un capricho del formulario, es multi-tenancy real — el
 * mismo email puede tener cuenta en varias organizaciones, y son usuarios
 * distintos con roles distintos.
 */
export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const [modo, setModo] = useState<Modo>('login');
  const [organizacion, setOrganizacion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Quien ya tiene sesión no tiene nada que hacer aquí.
  useEffect(() => {
    if (status === 'authenticated') router.replace('/tickets');
  }, [status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const { accessToken } =
        modo === 'login'
          ? await authApi.login({
              organizationSlug: organizacion.trim(),
              email: email.trim(),
              password,
            })
          : await authApi.register({
              organizationName: organizacion.trim(),
              email: email.trim(),
              password,
            });

      setAccessToken(accessToken);
      const perfil = await authApi.me();
      setUser({
        id: perfil.userId,
        email: email.trim(),
        tenantId: perfil.tenantId,
        role: perfil.role,
      });
      router.replace('/tickets');
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'No se pudo completar la operación.',
      );
      setEnviando(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {modo === 'login' ? 'Entrar' : 'Crear organización'}
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          {modo === 'login'
            ? 'Indicá tu organización para identificar la cuenta.'
            : 'Se crea la organización y quedás como administrador.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org">
              {modo === 'login' ? 'Organización (slug)' : 'Nombre de la organización'}
            </Label>
            <Input
              id="org"
              value={organizacion}
              onChange={(e) => setOrganizacion(e.target.value)}
              placeholder={modo === 'login' ? 'acme' : 'Acme SL'}
              autoComplete="organization"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@acme.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                modo === 'login' ? 'current-password' : 'new-password'
              }
              minLength={8}
              required
            />
          </div>

          <ErrorText>{error}</ErrorText>

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando
              ? 'Enviando…'
              : modo === 'login'
                ? 'Entrar'
                : 'Crear organización'}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setModo(modo === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {modo === 'login'
            ? '¿No tenés organización? Creá una'
            : '¿Ya tenés cuenta? Entrá'}
        </button>
      </Card>
    </main>
  );
}
