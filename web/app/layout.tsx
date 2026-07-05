import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeusPro | CRM & Automação Inteligente",
  description: "SaaS de alta performance para gestão de Leads e WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-gray-50 flex flex-col">
        {children}
      </body>
    </html>
  );
}