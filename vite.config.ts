/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sessionsPlugin } from "./vite-plugins/sessions";

export default defineConfig({
  plugins: [react(), sessionsPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    css: false,
  },
});
