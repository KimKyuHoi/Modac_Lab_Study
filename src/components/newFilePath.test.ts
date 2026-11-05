import { newFilePath } from "./newFilePath";

test("puts new files under /src and accepts nested folders", () => {
  expect(newFilePath("useDebounce.js", [])).toEqual({ path: "/src/useDebounce.js" });
  expect(newFilePath("src/hooks/useX.js", [])).toEqual({ path: "/src/hooks/useX.js" });
  expect(newFilePath("/src/List.jsx", [])).toEqual({ path: "/src/List.jsx" });
});

test("rejects empty names, unsupported types, traversal and duplicates", () => {
  expect(newFilePath("  ", [])).toHaveProperty("error");
  expect(newFilePath("notes.md", [])).toHaveProperty("error");
  expect(newFilePath("../index.js", [])).toHaveProperty("error");
  expect(newFilePath("a b.js", [])).toHaveProperty("error");
  expect(newFilePath("VideoList.jsx", ["/src/VideoList.jsx"])).toHaveProperty("error");
});
