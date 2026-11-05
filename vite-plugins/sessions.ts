import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const ID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/; // ulid
const LIST_RE = /^\/__sessions\/?(?:\?.*)?$/;
const ONE_RE = /^\/__sessions\/(.+?)\/?(?:\?.*)?$/;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/** 세션 저장 미들웨어. 처리했으면 true, 아니면 false. */
export async function handleSessions(dir: string, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url ?? "";
  if (req.method === "GET" && LIST_RE.test(url)) {
    fs.mkdirSync(dir, { recursive: true });
    const sessions = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    send(res, 200, sessions);
    return true;
  }
  const m = ONE_RE.exec(url);
  if (req.method === "POST" && m) {
    const id = decodeURIComponent(m[1]);
    if (!ID_RE.test(id)) {
      send(res, 400, { error: "세션 id 형식이 잘못됐어요." });
      return true;
    }
    const raw = await readBody(req);
    try {
      JSON.parse(raw);
    } catch {
      send(res, 400, { error: "본문이 JSON이 아니에요." });
      return true;
    }
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}.json`), raw, "utf8");
    send(res, 201, { ok: true, path: `${dir}/${id}.json` });
    return true;
  }
  return false;
}

export function sessionsPlugin(dir = "data/sessions"): Plugin {
  return {
    name: "sessions-file-store",
    configureServer(server) {
      const abs = path.resolve(server.config.root, dir);
      server.middlewares.use((req, res, next) => {
        handleSessions(abs, req, res).then((handled) => {
          if (!handled) next();
        }, next);
      });
    },
  };
}
