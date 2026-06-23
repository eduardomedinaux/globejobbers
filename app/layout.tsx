import type { Metadata } from "next";
import localFont from "next/font/local";
import { Kaushan_Script } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
// Usada só na wordmark "GlobeJobbers" (ver components/wordmark.tsx).
const kaushanScript = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kaushan-script",
});

export const metadata: Metadata = {
  title: "GlobeJobbers — Score Internacional do seu perfil",
  description:
    "Cole seu perfil de LinkedIn e descubra, em minutos, o quão pronto ele está para recrutadores internacionais que pagam em dólar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${kaushanScript.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
