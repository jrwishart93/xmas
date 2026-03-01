import type { Metadata } from "next";
import Image from "next/image";
import BackgroundImage from "@/app/images/Background-court-image.png";

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
    <html lang="en">
      <body className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <Image
            src={BackgroundImage}
            alt="Tribunal background atmosphere"
            fill
            priority
            className="object-cover opacity-40 blur-[8px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black/90" />
        </div>
        {children}
      </body>
    </html>
  );
}
