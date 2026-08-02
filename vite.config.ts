import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { defineConfig } from "vitest/config";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      entryRoot: "src",
      exclude: ["src/**/*.test.tsx", "src/lib", "src/test"],
      include: ["src"],
      insertTypesEntry: true,
      tsconfigPath: "./tsconfig.lib.json",
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(directory, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "voice-pro-ui",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
