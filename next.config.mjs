const legacyRouteRewrites = [
  { source: "/login", destination: "/legacy/login/index.html" },
  { source: "/login/:path*", destination: "/legacy/login/index.html" },
  { source: "/app/dashboard", destination: "/legacy/app/dashboard/index.html" },
  { source: "/app/dashboard/:path*", destination: "/legacy/app/dashboard/index.html" },
  { source: "/app/team", destination: "/legacy/app/team/index.html" },
  { source: "/app/team/:path*", destination: "/legacy/app/team/index.html" },
  { source: "/app/cases", destination: "/legacy/app/cases/index.html" },
  { source: "/app/cases/:path*", destination: "/legacy/app/cases/index.html" },
  { source: "/app/issue", destination: "/legacy/app/issue/index.html" },
  { source: "/app/issue/:path*", destination: "/legacy/app/issue/index.html" },
  { source: "/app/leaderboard", destination: "/legacy/app/leaderboard/index.html" },
  { source: "/app/leaderboard/:path*", destination: "/legacy/app/leaderboard/index.html" },
  { source: "/app/act", destination: "/legacy/app/act/index.html" },
  { source: "/app/act/:path*", destination: "/legacy/app/act/index.html" },
  { source: "/app/disbursements", destination: "/legacy/app/disbursements/index.html" },
  { source: "/app/disbursements/:path*", destination: "/legacy/app/disbursements/index.html" },
  { source: "/app/scn/:scnId", destination: "/legacy/app/scn/index.html" },
  { source: "/app/scn/:scnId/:path*", destination: "/legacy/app/scn/index.html" },
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: "/app",
        destination: "/app/dashboard/",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return legacyRouteRewrites;
  },
};

export default nextConfig;
