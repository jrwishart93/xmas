import type { ReactNode } from "react";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Summary Justice Act",
    template: "%s | Summary Justice Act",
  },
  description: "Summary Justice (Social Contributions) Act 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-root">{children}</body>
    </html>
  );
}
