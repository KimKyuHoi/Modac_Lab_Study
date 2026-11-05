import { z } from "zod";

const generateContent = vi.fn();
const ctorOptions: unknown[] = [];
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
    constructor(opts: unknown) {
      ctorOptions.push(opts);
    }
  },
}));

beforeEach(() => {
  generateContent.mockReset();
  vi.stubEnv("VITE_GEMINI_API_KEY", "test-key");
});
afterEach(() => vi.unstubAllEnvs());

test("callJson retries once on invalid JSON and returns parsed value", async () => {
  const { callJson } = await import("./gemini");
  generateContent.mockResolvedValueOnce({ text: "{not json" }).mockResolvedValueOnce({ text: '{"ok":true}' });
  const schema = z.object({ ok: z.boolean() });
  const out = await callJson("judge", "sys", [{ role: "user", text: "hi" }], { type: "object" }, (raw) => schema.parse(raw));
  expect(out).toEqual({ ok: true });
  expect(generateContent).toHaveBeenCalledTimes(2);
});

test("callJson gives up after the second failure", async () => {
  const { callJson } = await import("./gemini");
  generateContent.mockResolvedValue({ text: "nope" });
  await expect(callJson("judge", "sys", [], { type: "object" }, (raw) => z.object({ ok: z.boolean() }).parse(raw))).rejects.toThrow();
  expect(generateContent).toHaveBeenCalledTimes(2);
});

test("callText throws a readable error when the key is not configured", async () => {
  vi.stubEnv("VITE_GEMINI_API_KEY", "");
  vi.resetModules();
  const { callText, isConfigured } = await import("./gemini");
  expect(isConfigured()).toBe(false);
  await expect(callText("stakeholder", "sys", [{ role: "user", text: "hi" }])).rejects.toThrow("VITE_GEMINI_API_KEY");
});

test("callText passes system instruction and turns to generateContent", async () => {
  vi.resetModules();
  const { callText } = await import("./gemini");
  generateContent.mockResolvedValueOnce({ text: "답" });
  const out = await callText("stakeholder", "페르소나", [{ role: "user", text: "질문" }]);
  expect(out).toBe("답");
  const arg = generateContent.mock.calls[0][0];
  expect(arg.config.systemInstruction).toBe("페르소나");
  expect(arg.contents).toEqual([{ role: "user", parts: [{ text: "질문" }] }]);
});

test("client is created with a 60s request timeout", async () => {
  vi.resetModules();
  const { callText } = await import("./gemini");
  generateContent.mockResolvedValueOnce({ text: "ok" });
  await callText("stakeholder", "sys", [{ role: "user", text: "hi" }]);
  expect(ctorOptions[ctorOptions.length - 1]).toMatchObject({ apiKey: "test-key", httpOptions: { timeout: 60_000 } });
});

test("each role uses its own model env, falling back to VITE_GEMINI_MODEL then the default", async () => {
  vi.stubEnv("VITE_GEMINI_MODEL", "");
  vi.stubEnv("VITE_GEMINI_MODEL_STAKEHOLDER", "");
  vi.stubEnv("VITE_GEMINI_MODEL_ASSISTANT", "gemini-3.5-flash-lite");
  vi.stubEnv("VITE_GEMINI_MODEL_JUDGE", "");
  vi.resetModules();
  let { modelName } = await import("./gemini");
  expect(modelName("assistant")).toBe("gemini-3.5-flash-lite");
  expect(modelName("stakeholder")).toBe("gemini-3.6-flash");

  vi.stubEnv("VITE_GEMINI_MODEL", "shared-model");
  vi.resetModules();
  ({ modelName } = await import("./gemini"));
  expect(modelName("judge")).toBe("shared-model");
  expect(modelName("assistant")).toBe("gemini-3.5-flash-lite");
});

test("callText sends the model for the given role", async () => {
  vi.stubEnv("VITE_GEMINI_MODEL_JUDGE", "judge-model");
  vi.resetModules();
  const { callText } = await import("./gemini");
  generateContent.mockResolvedValueOnce({ text: "ok" });
  await callText("judge", "sys", [{ role: "user", text: "hi" }]);
  expect(generateContent.mock.calls[0][0].model).toBe("judge-model");
});

test("callText sends attached images as inlineData before the text", async () => {
  vi.resetModules();
  const { callText } = await import("./gemini");
  generateContent.mockResolvedValueOnce({ text: "ok" });
  await callText("assistant", "sys", [{ role: "user", text: "이거 왜 깨져요?", images: ["data:image/jpeg;base64,QUJD"] }]);
  expect(generateContent.mock.calls[0][0].contents).toEqual([
    { role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: "QUJD" } }, { text: "이거 왜 깨져요?" }] },
  ]);
});
