import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { handleSessions } from "./sessions";

function req(method: string, url: string, body?: string) {
  const r = new EventEmitter() as EventEmitter & { method: string; url: string };
  r.method = method;
  r.url = url;
  queueMicrotask(() => {
    if (body) r.emit("data", Buffer.from(body));
    r.emit("end");
  });
  return r;
}

function res() {
  const r = { statusCode: 0, headers: {} as Record<string, string>, body: "", ended: false };
  return Object.assign(r, {
    setHeader(k: string, v: string) { r.headers[k] = v; },
    end(b?: string) { r.body = b ?? ""; r.ended = true; },
  });
}

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "sessions-")); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

test("POST /__sessions/:id writes <dir>/<id>.json and returns 201", async () => {
  const r = res();
  const handled = await handleSessions(dir, req("POST", `/__sessions/${ID}`, JSON.stringify({ id: ID, a: 1 })) as never, r as never);
  expect(handled).toBe(true);
  expect(r.statusCode).toBe(201);
  expect(JSON.parse(fs.readFileSync(path.join(dir, `${ID}.json`), "utf8"))).toEqual({ id: ID, a: 1 });
});

test("POST with invalid id returns 400 and writes nothing", async () => {
  const r = res();
  await handleSessions(dir, req("POST", "/__sessions/../etc", "{}") as never, r as never);
  expect(r.statusCode).toBe(400);
  expect(fs.readdirSync(dir)).toHaveLength(0);
});

test("GET /__sessions lists saved sessions", async () => {
  fs.writeFileSync(path.join(dir, `${ID}.json`), JSON.stringify({ id: ID }));
  fs.writeFileSync(path.join(dir, "notes.txt"), "x");
  const r = res();
  await handleSessions(dir, req("GET", "/__sessions") as never, r as never);
  expect(r.statusCode).toBe(200);
  expect(JSON.parse(r.body)).toEqual([{ id: ID }]);
});

test("unrelated urls are not handled", async () => {
  const r = res();
  expect(await handleSessions(dir, req("GET", "/index.html") as never, r as never)).toBe(false);
});
