import { GoogleGenAI } from "@google/genai";

export type Turn = { role: "user" | "model"; text: string };

const DEFAULT_MODEL = "gemini-flash-latest";

function apiKey(): string {
  return (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ?? "";
}

export function modelName(): string {
  return (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || DEFAULT_MODEL;
}

export function isConfigured(): boolean {
  return apiKey().length > 0;
}

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!isConfigured()) {
    throw new Error("VITE_GEMINI_API_KEY가 비어 있어요. .env.local에 키를 넣고 개발 서버를 다시 시작하세요.");
  }
  if (!client) client = new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

function toContents(turns: Turn[]) {
  return turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
}

export async function callText(system: string, turns: Turn[]): Promise<string> {
  const res = await ai().models.generateContent({
    model: modelName(),
    contents: toContents(turns),
    config: { systemInstruction: system, temperature: 0.6 },
  });
  const text = res.text?.trim();
  if (!text) throw new Error("모델이 빈 응답을 보냈어요. 다시 시도해 주세요.");
  return text;
}

/** JSON 응답을 받아 parse로 검증한다. 검증 실패 시 1회 재호출. */
export async function callJson<T>(system: string, turns: Turn[], jsonSchema: object, parse: (raw: unknown) => T): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ai().models.generateContent({
      model: modelName(),
      contents: toContents(turns),
      config: {
        systemInstruction: system,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    });
    try {
      const raw = JSON.parse(stripFence(res.text ?? ""));
      return parse(raw);
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`모델 응답이 형식에 맞지 않아요: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function stripFence(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}
