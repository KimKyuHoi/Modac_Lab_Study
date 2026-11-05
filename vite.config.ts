/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sessionsPlugin } from "./vite-plugins/sessions";

export default defineConfig({
  plugins: [react(), sessionsPlugin()],
  // WSL에서 /mnt/c(OneDrive) 경로는 inotify 이벤트가 오지 않아 HMR이 멈춘다. 폴링으로 감시한다.
  server: { watch: { usePolling: true, interval: 700 } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    css: false,
  },
});
