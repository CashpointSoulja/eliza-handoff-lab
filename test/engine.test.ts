import { describe, expect, it } from "vitest";
import { gate, runEval } from "../src/engine/evals";
import { simulate } from "../src/engine/policy";
import { nextOnRota, onRota, SAMPLE_PROVIDER, toMinutes, validateProvider } from "../src/engine/provider";
import { SCENARIOS } from "../src/engine/scenarios";
import { detect } from "../src/engine/signals";
import type { Provider, Scenario } from "../src/engine/types";

const byId = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const clone = (p: Provider): Provider => JSON.parse(JSON.stringify(p));
const onCall = SAMPLE_PROVIDER.contacts.find((c) => c.role === "on_call_manager")!;
const priya = SAMPLE_PROVIDER.contacts.find((c) => c.id === "priya")!;

describe("rota", () => {
  it("handles overnight windows across midnight", () => {
    expect(onRota(onCall, toMinutes("2026-09-28T23:30"))).toBe(true); // Mon night
    expect(onRota(onCall, toMinutes("2026-09-29T07:45"))).toBe(true); // Tue early
    expect(onRota(onCall, toMinutes("2026-09-29T12:00"))).toBe(false);
  });
  it("finds the next admissions shift after a Sunday evening", () => {
    expect(nextOnRota(priya, toMinutes("2026-10-04T19:30"))).toBe(toMinutes("2026-10-05T09:00"));
  });
  it("validates provider configs", () => {
    expect(validateProvider(SAMPLE_PROVIDER)).toEqual([]);
    const bad = clone(SAMPLE_PROVIDER);
    bad.contacts[0].rota[0].start = "25:00";
    bad.rules.safeguardingLeadId = "nobody";
    expect(validateProvider(bad)).toHaveLength(2);
  });
});

describe("signals", () => {
  it("catches indirect safeguarding only with the full classifier", () => {
    const t = "She's frightened of the carer and has bruises on her arm.";
    expect(detect(t, "full").flags).toContain("safeguarding");
    expect(detect(t, "lite").flags).not.toContain("safeguarding");
  });
  it("does not treat a job enquiry as an availability question", () => {
    const d = detect("Do you have any vacancies for a carer job?", "full");
    expect(d.flags).toContain("non_enquiry");
    expect(d.flags).not.toContain("asked_availability");
  });
  it("extracts slots", () => {
    const d = detect("Hi, I'm Sarah. My mum has dementia and is being discharged on Friday. We're self-funding.", "full");
    expect(d.slots).toMatchObject({ callerName: "Sarah", relationship: "mum", careType: "dementia", funding: "Self-funding" });
    expect(d.slots.timeframe).toBe("on friday");
  });
});

describe("policies on the 7pm discharge call (S01)", () => {
  it("v1 breaks three provider-trust rules", () => {
    const r = simulate(byId("S01"), SAMPLE_PROVIDER, "v1");
    expect(r.violations.sort()).toEqual(
      ["availability_overpromised", "price_disclosed_against_rules", "unbacked_callback_promise"].sort(),
    );
    expect(r.resolved).toBe(false);
  });
  it("v2 books an on-call priority callback, quotes a from-price, offers the sister home", () => {
    const r = simulate(byId("S01"), SAMPLE_PROVIDER, "v2");
    expect(r.route).toBe("priority_callback");
    expect(r.violations).toEqual([]);
    expect(r.packet?.routeTo?.role).toBe("on_call_manager");
    expect(r.packet?.due).toBe("2026-09-28T19:40");
    const said = r.trace.map((t) => t.eliza).join(" ");
    expect(said).toContain("from £1,250");
    expect(said).not.toContain("£1,520");
    expect(said).toContain("Harbour View");
    expect(r.enquiryCaptured).toBe(true);
  });
  it("respects a provider rule change to wait for the morning", () => {
    const p = clone(SAMPLE_PROVIDER);
    p.rules.urgentOutOfHours = "next_business_morning";
    const r = simulate(byId("S01"), p, "v2");
    expect(r.route).toBe("priority_callback");
    expect(r.packet?.routeTo?.name).toBe(priya.name);
    expect(r.packet?.due).toBe("2026-09-29T09:00");
  });
  it("never quotes a price when the provider forbids it", () => {
    const p = clone(SAMPLE_PROVIDER);
    p.rules.pricePolicy = "no_prices";
    const said = simulate(byId("S01"), p, "v2").trace.map((t) => t.eliza).join(" ");
    expect(said).not.toMatch(/£/);
  });
});

describe("handoff rules", () => {
  it("emergencies always go to 999, even for the baseline", () => {
    for (const id of ["v1", "v2", "v3"] as const) expect(simulate(byId("S03"), SAMPLE_PROVIDER, id).route).toBe("emergency_redirect");
  });
  it("never transfers to an empty rota (v2) and flags it when v1 does", () => {
    expect(simulate(byId("S08"), SAMPLE_PROVIDER, "v2").route).toBe("standard_callback");
    expect(simulate(byId("S08"), SAMPLE_PROVIDER, "v1").violations).toContain("transfer_to_empty_rota");
  });
  it("routes safeguarding to on-call when the lead is off rota", () => {
    const r = simulate(byId("S04"), SAMPLE_PROVIDER, "v2");
    expect(r.route).toBe("safeguarding_escalation");
    expect(r.packet?.routeTo?.role).toBe("on_call_manager");
  });
  it("routes an unlabelled custom conversation and still checks safeguarding", () => {
    const s: Scenario = {
      id: "custom",
      title: "custom",
      channel: "chat",
      startedAt: "2026-09-29T10:00",
      trackingNumber: "chat-widget",
      turns: ["My dad's carer keeps shouting at him and I'm worried."],
    };
    expect(simulate(s, SAMPLE_PROVIDER, "v3").violations).toContain("safeguarding_missed");
    expect(simulate(s, SAMPLE_PROVIDER, "v2").route).toBe("safeguarding_escalation");
  });
});

describe("evals and release gate", () => {
  const v1 = runEval("v1", SAMPLE_PROVIDER);
  const v2 = runEval("v2", SAMPLE_PROVIDER);
  const v3 = runEval("v3", SAMPLE_PROVIDER);
  it("v2 routes every labelled case correctly with no violations", () => {
    expect(v2.cases.filter((c) => !c.correct).map((c) => c.id)).toEqual([]);
    expect(v2.metrics.trustViolations).toBe(0);
  });
  it("v1 has higher containment but false containment", () => {
    expect(v1.metrics.containment).toBeGreaterThan(v2.metrics.containment);
    expect(v1.metrics.falseContainment).toBeGreaterThan(0);
  });
  it("ships v2 over v1 and blocks v3 on the indirect safeguarding case", () => {
    expect(gate(v2, v1).decision).toBe("ship");
    const g = gate(v3, v2);
    expect(g.decision).toBe("block");
    expect(g.regressions.map((r) => r.id)).toEqual(["S04"]);
  });
});
