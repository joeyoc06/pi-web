import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Allows verifying a production build without replacing the running server's assets.
  buildDirectory: process.env.PI_WEB_BUILD_DIR || "build",
} satisfies Config;
