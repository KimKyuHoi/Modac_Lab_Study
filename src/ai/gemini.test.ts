import { z } from "zod";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
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
  const out = await callJson("sys", [{ role: "user", text: "hi" }], { type: "object" }, (raw) => schema.parse(raw));
  expect(out).toEqual({ ok: true });
  expect(generateContent).toHaveBeenCalledTimes(2);
});

test("callJson gives up after the second failure", async () => {
  const { callJson } = await import("./gemini");
  generateContent.mockResolvedValue({ text: "nope" });
  await expect(callJson("sys", [], { type: "object" }, (raw) => z.object({ ok: z.boolean() }).parse(raw))).rejects.toThrow();
  expect(generateContent).toHaveBeenCalledTimes(2);
});

test("callText throws a readable error when the key is not configured", async () => {
  vi.stubEnv("VITE_GEMINI_API_KEY", "");
  vi.resetModules();
  const { callText, isConfigured } = await import("./gemini");
  expect(isConfigured()).toBe(false);
  await expect(callText("sys", [{ role: "user", text: "hi" }])).rejects.toThrow("VITE_GEMINI_API_KEY");
});

test("callText passes system instruction and turns to generateContent", async () => {
  vi.resetModules();
  const { callText } = await import("./gemini");
  generateContent.mockResolvedValueOnce({ text: "답" });
  const out = await callText("페르소나", [{ role: "user", text: "질문" }]);
  expect(out).toBe("답");
  const arg = generateContent.mock.calls[0][0];
  expect(arg.config.systemInstruction).toBe("페르소나");
  expect(arg.contents).toEqual([{ role: "user", parts: [{ text: "질문" }] }]);
});
