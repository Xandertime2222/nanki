import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for jsdom (needed by cmdk and framer-motion)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill scrollIntoView for jsdom (needed by cmdk)
Element.prototype.scrollIntoView = function () {};

// Polyfill matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});