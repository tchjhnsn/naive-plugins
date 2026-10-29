#!/usr/bin/env node
// The plugin's MCP server: Naive's own server (naive mcp) on the venture in this folder, so a founder
// can do everything from the plugin. Outside a venture it offers one tool, naive_new_venture, which runs
// create-venture; once the venture exists it starts naive mcp on it and tells the client the tool list
// changed, so the session goes on without a restart. Node only, no dependencies, no shell (works on
// Windows). The venture's own install of naive-framework is used when it has one, else the published one.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

const cwd = process.cwd();
const FRAMEWORK = "naive-framework@^0.2";
const TYPES = ["software-startup", "vc-fund", "services-business", "local-business", "ecommerce", "creator-media", "nonprofit", "holding-company", "side-project"];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const out = (m) => process.stdout.write(JSON.stringify(m) + "\n");

/** The venture here: this folder, or the one subfolder that holds a venture.json. */
function findVenture() {
  if (existsSync(join(cwd, "venture.json"))) return cwd;
  let subs = [];
  try { subs = readdirSync(cwd, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && existsSync(join(cwd, d.name, "venture.json"))); } catch {}
  return subs.length === 1 ? join(cwd, subs[0].name) : null;
}

let child = null, init = null;
const swallow = new Set(); // ids of requests replayed to the child, whose answers the client already had

function startChild(dir, replay) {
  const local = join(dir, "node_modules", ".bin", process.platform === "win32" ? "naive.cmd" : "naive");
  const [cmd, args] = existsSync(local) ? [local, ["mcp"]] : [npx, ["-y", "-p", FRAMEWORK, "naive", "mcp"]];
  child = spawn(cmd, args, { cwd: dir, stdio: ["pipe", "pipe", "inherit"], shell: process.platform === "win32" });
  createInterface({ input: child.stdout }).on("line", (line) => {
    try { const m = JSON.parse(line); if (m.id !== undefined && swallow.delete(m.id)) return; } catch {}
    process.stdout.write(line + "\n");
  });
  child.on("exit", (code) => process.exit(code ?? 0));
  if (replay && init) {
    const id = `naive-replay-${Date.now()}`;
    swallow.add(id);
    child.stdin.write(JSON.stringify({ ...init, id }) + "\n");
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    out({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
  }
}

const NEW_VENTURE = {
  name: "naive_new_venture",
  description: "Create a Naive venture in a new folder here (runs create-venture). Ask the founder for each field first; never guess the name, the people or the type. When it is created, Naive's full tool set appears on this same server: run the naive-setup skill next.",
  inputSchema: { type: "object", required: ["folder", "name"], properties: {
    folder: { type: "string", description: "A new folder name, such as acme-labs" },
    name: { type: "string", description: "The founder's name" },
    team: { type: "array", items: { type: "string" }, description: "Everyone else founding it, by name" },
    type: { enum: TYPES, description: "The venture type, when the founder picked one" },
    describe: { type: "string", description: "What the venture is in a few words, when no type was picked" },
    role: { type: "string", description: "The founder's role, such as founder or investor" },
    sources: { type: "array", items: { type: "string" }, description: "Where a function keeps its truth, as function=system, such as finance=rho" } } },
};

function createVenture(a) {
  if (!/^[A-Za-z0-9._-]+$/.test(a.folder ?? "")) return { error: "folder must be a plain folder name, such as acme-labs" };
  const args = ["-y", "create-venture@latest", a.folder, "--yes", "--name", a.name];
  if (a.team?.length) args.push("--team", a.team.join(", "));
  if (a.type) args.push("--type", a.type); else if (a.describe) args.push("--describe", a.describe);
  if (a.role) args.push("--role", a.role);
  for (const s of a.sources ?? []) args.push("--source", s);
  const r = spawnSync(npx, args, { cwd, encoding: "utf8", shell: process.platform === "win32", timeout: 600000 });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  const dir = resolve(cwd, a.folder);
  if (r.status !== 0 || !existsSync(join(dir, "venture.json"))) return { error: text || "create-venture failed" };
  return { dir, text };
}

function handle(m) {
  if (m.method === "initialize") {
    init = m;
    return out({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params?.protocolVersion ?? "2025-06-18", capabilities: { tools: { listChanged: true } }, serverInfo: { name: "naive", version: "0.2.0" },
      instructions: "No Naive venture in this folder yet. Ask the founder what they are building and who is founding it, then call naive_new_venture." } });
  }
  if (m.method === "tools/list") return out({ jsonrpc: "2.0", id: m.id, result: { tools: [NEW_VENTURE] } });
  if (m.method === "tools/call") {
    if (m.params?.name !== NEW_VENTURE.name) return out({ jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: "No venture here yet: call naive_new_venture first." }] } });
    const r = createVenture(m.params.arguments ?? {});
    if (r.error) return out({ jsonrpc: "2.0", id: m.id, result: { isError: true, content: [{ type: "text", text: r.error }] } });
    out({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: `${r.text}\n\nCreated ${r.dir}. Naive's tools are now available on this server; run the naive-setup skill next.` }] } });
    return startChild(r.dir, true);
  }
  if (m.id !== undefined && m.method) return out({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: `${m.method} is not available until a venture exists` } });
}

const found = findVenture();
if (found) startChild(found, false);
createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  if (child) return child.stdin.write(line + "\n");
  let m; try { m = JSON.parse(line); } catch { return; }
  handle(m);
});
process.stdin.on("end", () => { if (child) child.stdin.end(); else process.exit(0); });
