import type { Metadata, Viewport } from "next";
import { businessConfig } from "@/data/configuration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(businessConfig.siteUrl),
  title: `${businessConfig.name} | ${businessConfig.tagline}`,
  description: `${businessConfig.name} a ${businessConfig.city}. Esperienza 3D interattiva: patenti AM, A e B, rinnovo patenti e recupero punti.`,
  applicationName: businessConfig.name,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: `${businessConfig.name} | ${businessConfig.tagline}`,
    description: `Segui il percorso 3D di ${businessConfig.name} a ${businessConfig.city}: patenti, rinnovo e recupero punti.`,
    type: "website",
    locale: "it_IT",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F3F1E9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
