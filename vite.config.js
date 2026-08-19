import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GITHUB_PAGES=true is set by the Pages deploy workflow so built asset
// URLs resolve under the project subpath instead of the domain root.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/Claude_MosBuisnes/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});
