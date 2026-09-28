import { gate, runEval, type EvalRun } from "../src/engine/evals";
import { SAMPLE_PROVIDER } from "../src/engine/provider";

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
const runs = (["v1", "v2", "v3"] as const).map((id) => runEval(id, SAMPLE_PROVIDER));

const row = (r: EvalRun) => {
  const m = r.metrics;
  return [
    r.policyName.padEnd(28),
    pct(m.routeAccuracy),
    pct(m.containment),
    String(m.falseContainment).padStart(5),
    pct(m.escalationRecall),
    pct(m.resolution),
    pct(m.enquiryCapture),
    pct(m.providerTrust),
    pct(m.safetyCriticalPass),
    `${m.latencyToFirstAudioMs}ms`.padStart(7),
  ].join(" ");
};
console.log("policy                       route  cont  falseC  escR   res  capt trust  safe  latency");
runs.forEach((r) => console.log(row(r)));
for (const r of runs)
  for (const c of r.cases.filter((k) => !k.correct || k.violations.length))
    console.log(`  ${r.policyId} ${c.id} expected=${c.expected} actual=${c.actual} ${c.violations.join(",")}`);

const [v1, v2, v3] = runs;
const promote = gate(v2, v1);
const fast = gate(v3, v2);
console.log(`\nGate v2 vs baseline v1: ${promote.decision.toUpperCase()}`);
console.log(`Gate v3 vs baseline v2: ${fast.decision.toUpperCase()}`);
fast.checks.filter((c) => !c.pass).forEach((c) => console.log(`  x ${c.name}: ${c.detail}`));
fast.regressions.forEach((r) => console.log(`  regression ${r.id} ${r.title}: ${r.baseline} -> ${r.candidate}`));

if (promote.decision !== "ship" || v2.metrics.routeAccuracy < 1) {
  console.error("\nThe handoff-aware policy (v2) must pass its own gate with 100% route accuracy.");
  process.exit(1);
}
