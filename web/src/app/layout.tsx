import type { Metadata } from "next";
import { Suspense } from "react";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Schub",
  description: "Find teammates and share ideas with other students.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
