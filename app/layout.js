import { Space_Grotesk, Work_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata = {
  title: "AuditDB Analyzer",
  description: "Panel de auditoria de bases de datos para Hass Peru",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${spaceGrotesk.variable} ${workSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
