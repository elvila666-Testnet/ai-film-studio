import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html")
      }
    }
  }
});
