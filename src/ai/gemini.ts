import { GoogleGenAI } from "@google/genai";

/** images: data URL(data:image/jpeg;base64,...). 모델에는 inlineData로 보낸다. */
export type Turn = { role: "user" | "model"; text: string; images?: string[] };

/**
 * 역할별 모델. 응시자마다 같은 모델로 평가받도록 별칭(-latest) 대신 버전을 고정한다.
 * - stakeholder: AI 실무진. 요구사항 질문에 페르소나를 지키며 답한다.
 * - assistant: 코딩 도우미. 시킨 일만 하고 설계는 응시자에게 맡긴다.
 * - judge: 설계 질의 생성, 꼬리질문 판단, 리포트 채점. 응시자에게 보이지 않으니 가장 좋은 모델을 쓴다.
 */
export type ModelRole = "stakeholder" | "assistant" | "judge";

const DEFAULT_MODELS: Record<ModelRole, string> = {
  stakeholder: "gemini-3.6-flash",
  assistant: "gemini-3.6-flash",
  judge: "gemini-3.6-flash",
};

// Vite는 import.meta.env.VITE_* 를 정적으로 치환하므로 키를 문자열로 조합하지 않고 직접 적는다.
function roleEnv(role: ModelRole): string | undefined {
  const env = {
    stakeholder: import.meta.env.VITE_GEMINI_MODEL_STAKEHOLDER,
    assistant: import.meta.env.VITE_GEMINI_MODEL_ASSISTANT,
    judge: import.meta.env.VITE_GEMINI_MODEL_JUDGE,
  }[role] as string | undefined;
  return env?.trim() || (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || undefined;
}
// 60초 안에 답이 없으면 실패로 보고 재시도 버튼을 띄운다. 응시자가 빈 화면에 갇히지 않게 한다.

function apiKey(): string {
  return (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ?? "";
}

/** 역할별 env → 공통 VITE_GEMINI_MODEL → 기본값 순으로 고른다. */
export function modelName(role: ModelRole): string {
  return roleEnv(role) || DEFAULT_MODELS[role];
}

export function isConfigured(): boolean {
  return apiKey().length > 0;
}

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!isConfigured()) {
    throw new Error("VITE_GEMINI_API_KEY가 비어 있어요. .env.local에 키를 넣고 개발 서버를 다시 시작하세요.");
  }
  if (!client) client = new GoogleGenAI({ apiKey: apiKey(), httpOptions: { timeout: 60_000 } });
  return client;
}

function toContents(turns: Turn[]) {
  return turns.map((t) => ({
    role: t.role,
    parts: [...(t.images ?? []).map(toInlineData), ...(t.text ? [{ text: t.text }] : [])],
  }));
}

function toInlineData(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) throw new Error("이미지 형식을 읽지 못했어요.");
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

export async function callText(role: ModelRole, system: string, turns: Turn[]): Promise<string> {
  const res = await ai().models.generateContent({
    model: modelName(role),
    contents: toContents(turns),
    config: { systemInstruction: system, temperature: 0.6 },
  });
  const text = res.text?.trim();
  if (!text) throw new Error("모델이 빈 응답을 보냈어요. 다시 시도해 주세요.");
  return text;
}

/** JSON 응답을 받아 parse로 검증한다. 검증 실패 시 1회 재호출. */
export async function callJson<T>(role: ModelRole, system: string, turns: Turn[], jsonSchema: object, parse: (raw: unknown) => T): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ai().models.generateContent({
      model: modelName(role),
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
