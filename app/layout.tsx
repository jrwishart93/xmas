import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import {
  SITE_DESCRIPTION,
  SITE_FULL_TITLE,
  SITE_ICON_PATH,
  SITE_NAME,
  SITE_OG_IMAGE_PATH,
  SITE_THEME_COLOR,
  SITE_TWITTER_IMAGE_PATH,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_FULL_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: SITE_ICON_PATH,
        type: "image/png",
        sizes: "504x495",
      },
    ],
    apple: [
      {
        url: SITE_ICON_PATH,
        type: "image/png",
        sizes: "504x495",
      },
    ],
    shortcut: [SITE_ICON_PATH],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_FULL_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "The Social Contributions Act share image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_FULL_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_TWITTER_IMAGE_PATH,
        alt: "The Social Contributions Act social preview",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: SITE_THEME_COLOR,
  colorScheme: "dark",
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
