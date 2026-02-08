/** @type {import('next').NextConfig} */
module.exports = {
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/play",
        destination: "/games/:gameId",
        permanent: true,
        has: [{ type: "query", key: "gameId", value: "(?<gameId>.*)" }],
      },
      {
        source: "/summary",
        destination: "/games/:gameId/summary",
        permanent: true,
        has: [{ type: "query", key: "gameId", value: "(?<gameId>.*)" }],
      },
      {
        source: "/join-game",
        destination: "/",
        permanent: true,
      },
    ];
  },
};
