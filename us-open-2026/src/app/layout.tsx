import { Nav } from "@/components/Nav";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Open Bracket — 2026 US Open", template: "%s · Open Bracket" },
  description: "Build, share, and score free 2026 US Open men's and women's singles prediction brackets.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <footer>
          <div><span className="brand-mark">OB</span><b>Open Bracket</b></div>
          <p>This is an independent fan prediction game and is not affiliated with or endorsed by the USTA or US Open. No money or prizes are involved.</p>
          <div><Link href="/how-it-works">Rules</Link><Link href="/brackets">Public brackets</Link></div>
        </footer>
      </body>
    </html>
  );
}
