import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

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
    <html lang="id" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
