import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/skip-for-wishes/",
  plugins: [react()],
  build: {
    outDir: "../skip-for-wishes",
    emptyOutDir: true,
    assetsDir: "assets"
  }
});

