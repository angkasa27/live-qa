import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans-ui", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif-reading", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono-label", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Sual: Tanya Jawab Majelis",
  description: "Kirim pertanyaan Anda ke pemateri, dengan nama atau anonim.",
  // Site-wide, inherited by every route: robots.txt asks crawlers not to fetch, this tells the
  // ones that fetch anyway not to index. See app/robots.ts and ROADMAP.md §8.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Safe-area insets only resolve when the page draws under the notch.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`h-full antialiased ${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
