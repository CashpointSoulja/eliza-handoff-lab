import { describe, expect, it } from "vitest";
import { createLabRunner, simulatePayload } from "../public/lab.js";
import { SCENARIOS } from "../src/engine/scenarios";
import type { SimulationResult } from "../src/engine/types";
import worker from "../src/worker";

type SimResponse = { result: SimulationResult; labels: { expectedRoute: string } | null };

async function simulateViaApi(body: unknown): Promise<SimResponse> {
  const req = new Request("http://lab.test/api/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await worker.fetch!(req as never, {} as never);
  expect(res.status).toBe(200);
  return (await res.json()) as SimResponse;
}

const selectCase = (scenarioId: string) => ({ custom: false, scenarioId });

describe("every labelled case runs its own conversation", () => {
  for (const s of SCENARIOS) {
    it(`${s.id} ${s.title}`, async () => {
      for (const policy of ["v1", "v2", "v3"]) {
        const d = await simulateViaApi(simulatePayload(selectCase(s.id), policy, undefined));
        expect(d.result.scenarioId).toBe(s.id);
        expect(d.result.trace.map((t) => t.family)).toEqual(s.turns);
        expect(d.labels?.expectedRoute).toBe(s.labels!.expectedRoute);
      }
    });
  }

  it("titles and transcripts are unique across cases", () => {
    expect(new Set(SCENARIOS.map((s) => s.title)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map((s) => s.turns[0])).size).toBe(SCENARIOS.length);
  });
});

describe("switching cases in the lab", () => {
  function harness(delays: Record<string, number>) {
    const rendered: { scenarioIds: string[]; firstTurns: string[]; routes: string[] }[] = [];
    const errors: string[] = [];
    const run = createLabRunner({
      simulate: async (selection: { scenarioId: string }, policy: string) => {
        await new Promise((r) => setTimeout(r, delays[selection.scenarioId] ?? 0));
        return simulateViaApi(simulatePayload(selection, policy, undefined));
      },
      render: (runs: [string, SimResponse][]) =>
        rendered.push({
          scenarioIds: runs.map(([, d]) => d.result.scenarioId),
          firstTurns: runs.map(([, d]) => d.result.trace[0].family),
          routes: runs.map(([, d]) => d.result.route),
        }),
      renderError: (e: Error) => errors.push(e.message),
    });
    return { run, rendered, errors };
  }

  it("S01 then S04 changes the transcript and the outcome", async () => {
    const { run, rendered } = harness({});
    await run(selectCase("S01"), ["v1", "v2"]);
    await run(selectCase("S04"), ["v1", "v2"]);
    const [s01, s04] = rendered;
    expect(s04.scenarioIds).toEqual(["S04", "S04"]);
    expect(s04.firstTurns[0]).toBe(SCENARIOS.find((s) => s.id === "S04")!.turns[0]);
    expect(s04.firstTurns).not.toEqual(s01.firstTurns);
    expect(s04.routes).toEqual(["contain_answer", "safeguarding_escalation"]);
    expect(s01.routes).toEqual(["standard_callback", "priority_callback"]);
  });

  it("a slow earlier request cannot overwrite the newly selected case", async () => {
    const { run, rendered } = harness({ S01: 60 });
    const first = run(selectCase("S01"), ["v1", "v2"]);
    const second = run(selectCase("S04"), ["v1", "v2"]);
    expect(await second).toBe("rendered");
    expect(await first).toBe("stale");
    expect(rendered).toHaveLength(1);
    expect(rendered[0].scenarioIds).toEqual(["S04", "S04"]);
  });

  it("rerunning the same case recomputes it", async () => {
    const { run, rendered } = harness({});
    await run(selectCase("S09"), ["v2"]);
    await run(selectCase("S09"), ["v2"]);
    expect(rendered.map((r) => r.scenarioIds[0])).toEqual(["S09", "S09"]);
  });

  it("refuses to render a result for a different case", async () => {
    const errors: string[] = [];
    const run = createLabRunner({
      simulate: () => simulateViaApi({ policy: "v2", scenarioId: "S01" }),
      render: () => {
        throw new Error("should not render");
      },
      renderError: (e: Error) => errors.push(e.message),
    });
    expect(await run(selectCase("S04"), ["v2"])).toBe("error");
    expect(errors[0]).toContain("S04 is selected");
  });
});
