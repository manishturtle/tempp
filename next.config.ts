// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
//   trailingSlash: true, // Helps with IIS routing
//   output: 'standalone', // Creates a standalone build that's easier to deploy to IIS
//   images: {
//     unoptimized: true, // Needed for static export if using next/image
//   },
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   // env: {
//   //   // Default tenant schema to use during server-side rendering and build
//   //   NEXT_PUBLIC_DEFAULT_TENANT_SCHEMA: 'default',
//   // },
//   // This is important for IIS to handle the base path correctly
//   basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
//   // Allows the application to be hosted in a subdirectory
//   assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
// };

// export default nextConfig;



import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: true, // Helps with IIS routing
  images: {
    unoptimized: true, // Needed for static export if using next/image
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;