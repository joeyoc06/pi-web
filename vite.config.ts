import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: ["omarchy.tail1eb3a2.ts.net"],
    watch: {
      // SQLite checkpoints update the tracked .data/app.db; don't reload on them.
      ignored: [".data/**/*"],
    },
  },
});
