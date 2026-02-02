import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    env: {
      VITE_GOOGLE_CLIENT_ID: "test-client-id-123",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/", "**/*.d.ts", "src/main.jsx"],
      thresholds: {
        global: {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
});
