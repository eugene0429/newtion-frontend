import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 25 ships an experimental native `localStorage` that lacks the
// Storage API methods (clear/setItem/getItem) when no --localstorage-file
// is configured, and it shadows jsdom's implementation. Install a minimal
// in-memory shim so persist middleware and tests can use Storage as expected.
function installStorageShim(key: "localStorage" | "sessionStorage") {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: storage,
  });
}

if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  installStorageShim("localStorage");
}
if (typeof sessionStorage === "undefined" || typeof sessionStorage.clear !== "function") {
  installStorageShim("sessionStorage");
}

// jsdom does not implement window.matchMedia; ThemeProvider needs it.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});
