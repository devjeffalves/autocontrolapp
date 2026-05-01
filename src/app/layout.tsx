import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "AutoControl - Gestão para Motoristas",
  description: "Gerencie suas corridas, quilometragem e consumo de combustível com facilidade.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AutoControl",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="container safe-area-top">
          {children}
          <div style={{ height: "100px" }} /> {/* Spacer for BottomNav */}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
