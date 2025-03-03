import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Note: This is only an example. If you use Pages Router,
  // use something else that works, such as "service-worker/index.ts".
  swSrc: "src/service-worker/app-worker.ts",
  swDest: "public/sw.js",
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
