import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PegWatch",
  description: "A stablecoin and RWA solvency monitor on GenLayer - validators independently fetch public reserve pages and reach consensus on SOLVENT / UNDERCOLLATERALISED.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-[color:var(--surface-border)]">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <div>
              <div className="text-sm font-semibold tracking-tight">PegWatch</div>
              <div className="text-xs text-[color:var(--muted)]">Solvency monitoring on GenLayer</div>
            </div>
            <nav className="flex items-center gap-4 text-xs text-[color:var(--muted)]">
              <Link href="/" className="hover:text-[color:var(--foreground)]">
                Assets
              </Link>
              <Link href="/about" className="hover:text-[color:var(--foreground)]">
                How it works
              </Link>
              <a
                href="https://github.com/HarrisonJL/pegwatch"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[color:var(--foreground)]"
              >
                Dashboard source ↗
              </a>
              <a
                href="https://github.com/HarrisonJL/solvency-oracle"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[color:var(--foreground)]"
              >
                Contract source ↗
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-[color:var(--surface-border)] px-4 py-4 text-center text-xs text-[color:var(--muted)] sm:px-6">
          GenLayer Bradbury testnet only &middot; no real value &middot; every verdict is agreed on by an independent validator committee reading public pages live, not one party&apos;s claim
        </footer>
      </body>
    </html>
  );
}
