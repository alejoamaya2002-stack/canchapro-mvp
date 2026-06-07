import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CanchaPro MVP",
  description: "Software de gestion comercial para complejos de futbol 5"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
