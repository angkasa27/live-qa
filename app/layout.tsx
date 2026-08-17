import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { QaProvider } from "@/lib/store";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ask — Live Event Q&A",
  description: "Send your question to the speaker, named or anonymous.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Safe-area insets only resolve when the page draws under the notch.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QaProvider>{children}</QaProvider>
      </body>
    </html>
  );
}
