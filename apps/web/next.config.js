const path = require("path");

/** @type {import('next').NextConfig} */
const isFirebaseBuild = process.env.FIREBASE_BUILD === "1";

const nextConfig = {
  output: isFirebaseBuild ? "export" : "standalone",
  ...(isFirebaseBuild
    ? {}
    : { outputFileTracingRoot: path.join(__dirname, "../../") }),
  transpilePackages: ["@centercrm/shared-types"],
  ...(isFirebaseBuild
    ? {
        images: { unoptimized: true },
        trailingSlash: true,
        staticPageGenerationTimeout: 180,
      }
    : {
        async rewrites() {
          const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
          return [
            {
              source: "/backend/:path*",
              destination: `${backend}/:path*`,
            },
          ];
        },
      }),
};

module.exports = nextConfig;
