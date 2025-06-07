import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    build: {
      minify: false,
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },

    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      css: true,
    },
  };
});
