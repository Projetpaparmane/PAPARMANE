import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "Récréaction", template: "%s · Récréaction" },
  description: "Inscription, dossard numérique et fiche médicale pour les événements sportifs.",
};

export const viewport: Viewport = {
  themeColor: "#14201B",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-CA" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                R
              </span>
              <span className="brand-name">Récréaction</span>
            </Link>
            <nav aria-label="Navigation principale">
              <Link href="/moi" className="nav-link">
                Mon compte
              </Link>
            </nav>
          </div>
        </header>
        <main id="contenu" className="site-main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container site-footer-inner">
            <span>Récréaction · Québec</span>
            <Link href="/confidentialite">Confidentialité</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
