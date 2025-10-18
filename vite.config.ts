import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
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
