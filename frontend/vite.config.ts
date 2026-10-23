import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tailwind v4 is wired in via its Vite plugin; no postcss config needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
