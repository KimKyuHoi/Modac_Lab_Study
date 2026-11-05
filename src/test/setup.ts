import "@testing-library/jest-dom/vitest";

// antd 컴포넌트가 jsdom에서 요구하는 matchMedia
// @vitest-environment node 테스트(esbuild 사용)에서는 window가 없다
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
