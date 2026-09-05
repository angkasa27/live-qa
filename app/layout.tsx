import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

// One family for the whole product. The Terang Hijau design carries no serif and no mono:
// weight and size do the work a second family used to, which is why the ramp runs to 800.
const sans = Public_Sans({
  variable: "--font-sans-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
    <html lang="id" className={`h-full antialiased ${sans.variable}`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
