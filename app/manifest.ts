import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_ICON_PATH, SITE_NAME, SITE_THEME_COLOR, SITE_TITLE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: SITE_THEME_COLOR,
    theme_color: SITE_THEME_COLOR,
    icons: [
      {
        src: SITE_ICON_PATH,
        sizes: "504x495",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
