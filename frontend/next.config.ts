import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["192.168.56.1", "localhost", "127.0.0.1"],
  async redirects() {
    return [
      { source: "/student/login", destination: "/login", permanent: false },
      { source: "/hospital/login", destination: "/login", permanent: false },
      { source: "/hospital/admin/login", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
