import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProviderWrapper } from "./providers";
import ConditionalNavigation from "@/components/ConditionalNavigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FindMyPic - Proteggi la tua privacy digitale",
  description: "Scopri se le tue foto sono state pubblicate online senza il tuo consenso. FindMyPic scansiona il web per proteggere la tua immagine e privacy.",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProviderWrapper>
          <ConditionalNavigation />
          {children}
        </AuthProviderWrapper>
      </body>
    </html>
  );
}
