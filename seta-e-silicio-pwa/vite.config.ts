import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { host: true, port: 5176 },
  preview: { host: true, port: 4176 },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 800
  }
});
