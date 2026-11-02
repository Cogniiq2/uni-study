import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";

export const metadata: Metadata = {
  title: { default: "Studium", template: "%s · Studium" },
  description: "Persönliche Lernplattform – Wirtschaftsinformatik",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Studium", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-dvh">
        <ProgressProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 sm:pb-16">{children}</main>
        </ProgressProvider>
      </body>
    </html>
  );
}
