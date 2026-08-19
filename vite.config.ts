import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    // Sandboxed/proxied preview hosts (e.g. *.e2b.app) must be accepted, otherwise the
    // dev server answers 403 to the very host the browser is loading it from.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3131',
        changeOrigin: true,
      },
    },
  },
});
