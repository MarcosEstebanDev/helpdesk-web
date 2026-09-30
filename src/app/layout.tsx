import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { AppProviders } from "@/providers";
import { guionAntiParpadeo } from "@/providers/theme-provider";
import "./globals.css";

/**
 * Inter para todo. Charlie Display, la tipografía de Atlassian, es propietaria;
 * Inter es el sustituto que el propio design system lleva en su pila de
 * respaldo, y comparte lo que importa aquí: alto de x grande y números que se
 * leen a 11px, que es el tamaño al que vive media bandeja de tickets.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/** Solo para identificadores y tiempos: el `#128` de un ticket es un dato, no prosa. */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Helpdesk",
    template: "%s · Helpdesk",
  },
  description: "SaaS de helpdesk multi-tenant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      // El script del `<head>` le cambia la clase antes de que React hidrate.
      // Sin esto, React avisaría de una discrepancia que es intencional.
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: guionAntiParpadeo }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
