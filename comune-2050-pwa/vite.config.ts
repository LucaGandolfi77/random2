import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { host: true, port: 5180 },
  preview: { host: true, port: 4180 },
  build: {
    target: "es2022",
    sourcemap: false
  }
});
