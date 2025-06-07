/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

declare global {
  const vi: (typeof import("vitest"))["vi"];
}
