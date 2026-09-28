import { DOCS } from "./docs";
import { gate, runEval } from "./engine/evals";
import { POLICIES, simulate, type PolicyId } from "./engine/policy";
import { SAMPLE_PROVIDER, toMinutes, validateProvider } from "./engine/provider";
import { SCENARIOS } from "./engine/scenarios";
import { ROUTE_LABELS, VIOLATION_LABELS, type Provider, type Scenario } from "./engine/types";

interface Env {
  ASSETS: Fetcher;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

const isPolicy = (p: unknown): p is PolicyId => typeof p === "string" && p in POLICIES;
const MAX_TURNS = 12;
const MAX_TURN_CHARS = 600;

function parseProvider(raw: unknown): Provider | string {
  if (raw === undefined) return SAMPLE_PROVIDER;
  if (typeof raw !== "object" || raw === null) return "'provider' must be an object";
  const p = raw as Provider;
  try {
    const problems = validateProvider(p);
    return problems.length ? problems.join("; ") : p;
  } catch {
    return "'provider' is malformed";
  }
}

function parseScenario(raw: unknown): Scenario | string {
  if (typeof raw !== "object" || raw === null) return "'scenario' must be an object";
  const s = raw as Record<string, unknown>;
  if (s.channel !== "voice" && s.channel !== "chat") return "'channel' must be voice or chat";
  if (typeof s.startedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.startedAt))
    return "'startedAt' must be YYYY-MM-DDTHH:MM";
  try {
    toMinutes(s.startedAt);
  } catch {
    return "'startedAt' is not a valid time";
  }
  const turns = s.turns;
  if (!Array.isArray(turns) || turns.length === 0 || turns.length > MAX_TURNS) return `'turns' must have 1–${MAX_TURNS} items`;
  if (!turns.every((t): t is string => typeof t === "string" && t.trim().length > 0 && t.length <= MAX_TURN_CHARS))
    return `each turn must be non-empty text up to ${MAX_TURN_CHARS} characters`;
  return {
    id: typeof s.id === "string" ? s.id.slice(0, 40) : "custom",
    title: typeof s.title === "string" ? s.title.slice(0, 120) : "Custom conversation",
    channel: s.channel,
    startedAt: s.startedAt,
    trackingNumber: typeof s.trackingNumber === "string" ? s.trackingNumber : "chat-widget",
    callerNumber: typeof s.callerNumber === "string" && s.callerNumber.trim() ? s.callerNumber.slice(0, 30) : undefined,
    turns: turns.map((t) => t.trim()),
  };
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return typeof b === "object" && b !== null ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/health") return json({ ok: true, engine: "deterministic", scenarios: SCENARIOS.length });

    if (path === "/api/meta" && request.method === "GET")
      return json({
        provider: SAMPLE_PROVIDER,
        policies: Object.values(POLICIES),
        scenarios: SCENARIOS,
        routeLabels: ROUTE_LABELS,
        violationLabels: VIOLATION_LABELS,
      });

    if (path === "/api/simulate" && request.method === "POST") {
      const b = await body(request);
      if (!b) return json({ error: "invalid JSON body" }, 400);
      if (!isPolicy(b.policy)) return json({ error: "'policy' must be v1, v2 or v3" }, 400);
      const provider = parseProvider(b.provider);
      if (typeof provider === "string") return json({ error: provider }, 400);
      let scenario: Scenario | string;
      if (typeof b.scenarioId === "string") {
        const found = SCENARIOS.find((s) => s.id === b.scenarioId);
        scenario = found ?? `unknown scenario ${b.scenarioId}`;
      } else scenario = parseScenario(b.scenario);
      if (typeof scenario === "string") return json({ error: scenario }, 400);
      return json({ result: simulate(scenario, provider, b.policy), labels: scenario.labels ?? null });
    }

    if (path === "/api/eval" && request.method === "POST") {
      const b = await body(request);
      if (!b) return json({ error: "invalid JSON body" }, 400);
      if (!isPolicy(b.baseline) || !isPolicy(b.candidate))
        return json({ error: "'baseline' and 'candidate' must be v1, v2 or v3" }, 400);
      const provider = parseProvider(b.provider);
      if (typeof provider === "string") return json({ error: provider }, 400);
      const baseline = runEval(b.baseline, provider);
      const candidate = runEval(b.candidate, provider);
      return json({ baseline, candidate, gate: gate(candidate, baseline) });
    }

    if (path === "/api/docs" && request.method === "GET")
      return json(DOCS.map(({ slug, title }) => ({ slug, title })));

    const docMatch = path.match(/^\/api\/docs\/([a-z0-9-]+)$/);
    if (docMatch && request.method === "GET") {
      const doc = DOCS.find((d) => d.slug === docMatch[1]);
      return doc ? json(doc) : json({ error: "doc not found" }, 404);
    }

    if (path.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
