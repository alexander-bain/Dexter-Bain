import { defineConfig } from "vite";

export default defineConfig({
  base: "/bluemath/",
  build: {
    outDir: "../bluemath",
    emptyOutDir: true,
    sourcemap: false,
    assetsDir: "assets"
  },
  server: {
    host: "127.0.0.1",
    port: 4173
  }
});
