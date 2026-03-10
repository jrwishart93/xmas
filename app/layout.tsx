import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import BackgroundImage from "@/app/images/Background-court-image.png";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Summary Justice Act",
  description: "Summary Justice (Social Contributions) Act 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100 [font-family:var(--font-inter)]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <Image
            src={BackgroundImage}
            alt="Tribunal background atmosphere"
            fill
            priority
            className="scale-105 object-cover opacity-40 blur-[8px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black/90" />
        </div>

        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-black/45 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-neutral-200 transition-colors hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0 text-neutral-400"
                aria-hidden="true"
              >
                <path d="M12 22a7 7 0 0 0 7-7H5a7 7 0 0 0 7 7Z" />
                <path d="M5 15H2" />
                <path d="M22 15h-3" />
                <path d="m17 6-5 5-5-5" />
                <path d="M12 3v8" />
              </svg>
              <span className="text-sm font-semibold tracking-wide">SJ Act 2025</span>
            </Link>

            <nav className="flex items-center gap-0.5" aria-label="Main">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-100"
              >
                Home
              </Link>
              <Link
                href="/act"
                className="rounded-md px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-white/10 hover:text-neutral-100"
              >
                The Act
              </Link>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
