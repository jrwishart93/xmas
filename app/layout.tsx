import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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
        {children}
      </body>
    </html>
  );
}
