import { candidateFiles } from "./files";

test("candidateFiles keeps only /src/ files, dropping sandpack template files", () => {
  const out = candidateFiles({ "/src/App.jsx": "a", "/App.js": "template", "/index.js": "entry", "/public/index.html": "<html>", "/src/api/banners.js": "b" });
  expect(Object.keys(out).sort()).toEqual(["/src/App.jsx", "/src/api/banners.js"]);
});
