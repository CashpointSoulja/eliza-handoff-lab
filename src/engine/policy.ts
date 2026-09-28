import {
  contactById,
  contactByRole,
  describeTime,
  nextOnRota,
  onRota,
  sourceFor,
  toLocal,
  toMinutes,
} from "./provider";
import { detect, detectsSafeguarding, type SafeguardingClassifier } from "./signals";
import {
  ROUTE_LABELS,
  type Contact,
  type Flag,
  type HandoffPacket,
  type LatencyBudget,
  type Provider,
  type RouteKind,
  type Scenario,
  type SimulationResult,
  type Slots,
  type TrustViolation,
  type TurnTrace,
} from "./types";

export type PolicyId = "v1" | "v2" | "v3";

export interface PolicyVersion {
  id: PolicyId;
  name: string;
  summary: string;
  /** Checks who is actually on rota before promising a transfer or a callback time. */
  rotaAware: boolean;
  safeguarding: SafeguardingClassifier;
  /** Refuses to confirm clinical capability; routes to the clinical lead. */
  clinicalGuard: boolean;
  /** Honours the provider's price and availability disclosure rules. */
  respectsDisclosureRules: boolean;
  /** Sends existing-resident issues to the home manager, not admissions. */
  complaintRouting: boolean;
  /** Declared budget, not a measurement. */
  latency: LatencyBudget;
}

export const POLICIES: Record<PolicyId, PolicyVersion> = {
  v1: {
    id: "v1",
    name: "v1 — Contain-first baseline",
    summary:
      "Answers everything itself and always offers a transfer or 'call back within the hour'. No rota awareness, no safeguarding path, answers clinical and pricing questions directly.",
    rotaAware: false,
    safeguarding: "none",
    clinicalGuard: false,
    respectsDisclosureRules: false,
    complaintRouting: false,
    latency: { sttEndpointMs: 300, modelFirstTokenMs: 700, ttsFirstAudioMs: 250 },
  },
  v2: {
    id: "v2",
    name: "v2 — Handoff-aware",
    summary:
      "Checks the provider's rota before promising anything, escalates safeguarding and clinical questions to named people, honours disclosure rules and writes a handoff packet so the family never repeats themselves.",
    rotaAware: true,
    safeguarding: "full",
    clinicalGuard: true,
    respectsDisclosureRules: true,
    complaintRouting: true,
    latency: { sttEndpointMs: 300, modelFirstTokenMs: 850, ttsFirstAudioMs: 250 },
  },
  v3: {
    id: "v3",
    name: "v3 — Fast path candidate",
    summary:
      "v2 with a smaller, faster model and a keyword-only safeguarding check. About 45% faster to first audio, but only catches safeguarding when the caller uses words like 'abuse' or 'neglect'.",
    rotaAware: true,
    safeguarding: "lite",
    clinicalGuard: true,
    respectsDisclosureRules: true,
    complaintRouting: true,
    latency: { sttEndpointMs: 200, modelFirstTokenMs: 350, ttsFirstAudioMs: 150 },
  },
};

const money = (n: number) => `£${n.toLocaleString("en-GB")}`;

interface Decision {
  route: RouteKind;
  contact: Contact | null;
  due: number | null;
  line: string;
  reasoning: string[];
  commitments: string[];
}

interface Ctx {
  provider: Provider;
  policy: PolicyVersion;
  scenario: Scenario;
  t0: number;
  flags: Set<Flag>;
  slots: Slots;
  violations: Set<TrustViolation>;
}

const has = (c: Ctx, f: Flag) => c.flags.has(f);

function must(c: Contact | undefined, what: string): Contact {
  if (!c) throw new Error(`provider has no ${what}`);
  return c;
}

function priceLine(c: Ctx): string {
  const { rules } = c.provider;
  const ct = c.slots.careType ?? "residential";
  const internal = rules.internalWeeklyRates[ct] ?? rules.fromPriceWeekly;
  if (!c.policy.respectsDisclosureRules || rules.pricePolicy === "exact") {
    if (rules.pricePolicy !== "exact") c.violations.add("price_disclosed_against_rules");
    return `Our ${ct} rate is ${money(internal)} a week.`;
  }
  if (rules.pricePolicy === "no_prices")
    return "Fees depend on the care assessment, so I'd rather the admissions team talk you through them properly.";
  return `Weekly fees start from ${money(rules.fromPriceWeekly)}; the exact figure depends on the care assessment.`;
}

function availabilityLine(c: Ctx): string {
  const { provider } = c;
  const ct = c.slots.careType ?? "residential";
  const home = provider.homes.find((h) => h.id === provider.primaryHomeId)!;
  const vac = home.vacancies[ct] ?? 0;
  if (!c.policy.respectsDisclosureRules) {
    if (vac === 0) c.violations.add("availability_overpromised");
    return "Yes, we have rooms available.";
  }
  if (!provider.rules.discloseAvailability)
    return "The team confirms availability directly, and I'll make sure they know you're asking.";
  if (vac > 0)
    return `${home.name} has ${vac} ${ct} room${vac > 1 ? "s" : ""} available at the moment. That can change quickly, so the team will confirm.`;
  const sister = provider.homes.find((h) => h.id !== home.id && (h.vacancies[ct] ?? 0) > 0);
  if (sister)
    return `${home.name} has no ${ct} rooms right now, but ${sister.name} has one. I can include that in what I pass to the team.`;
  return `There are no ${ct} rooms at the moment. I can add you to the waiting list and the team will call you if that changes.`;
}

function clinicalLine(c: Ctx): string {
  if (!c.policy.clinicalGuard) {
    c.violations.add("clinical_assurance_given");
    return "Yes, we can support that.";
  }
  const lead = contactByRole(c.provider, "clinical_lead");
  return `That's an important question and I don't want to guess. ${lead ? lead.name.split(" (")[0] : "Our clinical lead"} needs to assess that properly.`;
}

function followUp(c: Ctx): string {
  const s = c.slots;
  if (!s.relationship && !s.careType) return "Who is the care for, and what kind of support do they need?";
  if (!s.timeframe) return "When are you hoping care might start?";
  if (!s.callerName) return "Can I take your name?";
  if (!s.phone) return "What's the best number to reach you on?";
  if (!s.funding) return "Thank you. Do you know yet whether the care will be self-funded or supported by the council or NHS?";
  return "Thank you, that's really helpful.";
}

function firstName(ct: Contact) {
  return ct.name.split(" (")[0];
}

function transferOrCallback(c: Ctx, target: Contact, reason: string, urgent: boolean): Decision {
  const { t0, policy, scenario } = c;
  const onNow = onRota(target, t0);
  const reasoning = [reason];
  if (!policy.rotaAware) {
    if (!onNow) {
      c.violations.add("transfer_to_empty_rota");
      reasoning.push(`${target.name} is not on rota at ${toLocal(t0).slice(11)}: the transfer rings out.`);
    }
    return {
      route: "warm_transfer",
      contact: target,
      due: t0,
      line:
        scenario.channel === "voice"
          ? `I'm putting you through to ${firstName(target)} now.`
          : `I'm handing this chat to ${firstName(target)} now.`,
      reasoning,
      commitments: [`Live handover to ${target.name}`],
    };
  }
  if (onNow) {
    reasoning.push(`${target.name} is on rota now.`);
    return {
      route: "warm_transfer",
      contact: target,
      due: t0,
      line:
        scenario.channel === "voice"
          ? `I'm putting you through to ${firstName(target)} now and passing on what you've told me, so you won't need to repeat yourself.`
          : `I'm handing this chat to ${firstName(target)} now with a summary, so you won't need to repeat yourself.`,
      reasoning,
      commitments: [`Live handover to ${target.name}`],
    };
  }
  if (urgent) return priorityOutOfHours(c, reasoning);
  const next = nextOnRota(target, t0);
  reasoning.push(`${target.name} is off rota; next on ${next === null ? "unknown" : describeTime(next, t0)}.`);
  const when = next === null ? "as soon as they are back" : describeTime(next, t0).replace(/ \(in .*\)/, "");
  return {
    route: "standard_callback",
    contact: target,
    due: next,
    line: `The team isn't in right now. ${firstName(target)} will call you back ${next === null ? when : `on ${when}`}, and I've passed on everything so you won't need to repeat yourself.`,
    reasoning,
    commitments: [`Callback from ${target.name} ${when}`],
  };
}

function priorityOutOfHours(c: Ctx, reasoning: string[]): Decision {
  const { provider, t0 } = c;
  const onCall = contactByRole(provider, "on_call_manager");
  const admissions = must(contactByRole(provider, "admissions"), "admissions contact");
  if (provider.rules.urgentOutOfHours === "on_call" && onCall && onRota(onCall, t0)) {
    const due = t0 + provider.rules.priorityCallbackMinutes;
    reasoning.push(`Urgent and out of hours: provider rule sends this to ${onCall.name}, callback within ${provider.rules.priorityCallbackMinutes} min.`);
    return {
      route: "priority_callback",
      contact: onCall,
      due,
      line: `I've marked this as urgent. The ${onCall.name.toLowerCase()} will call you back within ${provider.rules.priorityCallbackMinutes} minutes, and they'll already have everything you've told me.`,
      reasoning,
      commitments: [`Priority callback from ${onCall.name} by ${describeTime(due, t0).replace(/ \(in .*\)/, "")}`],
    };
  }
  const next = nextOnRota(admissions, t0);
  reasoning.push(`Urgent; provider rule waits for ${admissions.name}, first thing ${next === null ? "(no rota)" : describeTime(next, t0)}.`);
  const when = next === null ? "as soon as they are back" : describeTime(next, t0).replace(/ \(in .*\)/, "");
  return {
    route: "priority_callback",
    contact: admissions,
    due: next,
    line: `I've marked this as urgent. ${firstName(admissions)} will call you first thing, ${when}, and will already have everything you've told me.`,
    reasoning,
    commitments: [`Priority callback from ${admissions.name} ${when}`],
  };
}

function naiveCallback(c: Ctx, reason: string): Decision {
  const { provider, t0 } = c;
  const admissions = must(contactByRole(provider, "admissions"), "admissions contact");
  const next = nextOnRota(admissions, t0);
  const reasoning = [reason, "Promises 'within the hour' without checking the rota."];
  if (next === null || next > t0 + 60) {
    c.violations.add("unbacked_callback_promise");
    reasoning.push(`${admissions.name} is next on rota ${next === null ? "never" : describeTime(next, t0)}.`);
  }
  return {
    route: "standard_callback",
    contact: admissions,
    due: t0 + 60,
    line: "Someone from the team will call you back within the hour.",
    reasoning,
    commitments: ["Callback within the hour"],
  };
}

function nextVisitSlot(c: Ctx, host: Contact): number | null {
  const dayStart = Math.floor(c.t0 / 1440) * 1440;
  for (let d = 1; d <= 8; d++) {
    const t = dayStart + d * 1440 + 11 * 60;
    if (onRota(host, t)) return t;
  }
  return null;
}

function decide(c: Ctx): Decision {
  const { provider, policy } = c;
  const admissions = must(contactByRole(provider, "admissions"), "admissions contact");
  const urgent = has(c, "urgent_timeline") || has(c, "distress");

  if (has(c, "existing_resident") || has(c, "complaint")) {
    if (policy.complaintRouting) {
      const manager = must(contactByRole(provider, "home_manager"), "home manager");
      return transferOrCallback(c, manager, "Existing resident or complaint: goes to the home manager, not sales.", false);
    }
    c.violations.add("complaint_routed_to_sales");
  }

  if (has(c, "non_enquiry"))
    return {
      route: "redirect_non_enquiry",
      contact: null,
      due: null,
      line: "This line is for families looking for care. For jobs or supplier enquiries, please use the contact details on our website. I'll let reception know you called.",
      reasoning: ["Not a care enquiry: redirect politely and keep it out of the enquiry pipeline."],
      commitments: [],
    };

  if (has(c, "clinical_question") && policy.clinicalGuard) {
    const lead = must(contactByRole(provider, "clinical_lead"), "clinical lead");
    return transferOrCallback(c, lead, "Clinical capability question: only a clinician can answer.", urgent);
  }

  if (has(c, "human_requested")) return transferOrCallback(c, admissions, "Family asked for a person.", urgent);

  if (urgent) {
    if (!policy.rotaAware) return naiveCallback(c, "Urgent timeline or distress detected.");
    if (onRota(admissions, c.t0))
      return transferOrCallback(c, admissions, "Urgent timeline or distress, and admissions is on rota.", true);
    return priorityOutOfHours(c, ["Urgent timeline or distress detected out of hours."]);
  }

  if (has(c, "wants_visit")) {
    const slot = nextVisitSlot(c, admissions);
    const when = slot === null ? "at the next available time" : describeTime(slot, c.t0).replace(/ \(in .*\)/, "");
    return {
      route: "contain_book_visit",
      contact: admissions,
      due: slot,
      line: `I've booked you a visit on ${when} with ${firstName(admissions)}. You'll get a text to confirm.`,
      reasoning: ["Visit requested: Eliza can book directly against the admissions rota."],
      commitments: [`Visit ${when} with ${admissions.name}`],
    };
  }

  if (has(c, "wants_callback")) {
    if (!policy.rotaAware) return naiveCallback(c, "Callback requested.");
    return transferOrCallback(c, admissions, "Callback requested.", false);
  }

  return {
    route: "contain_answer",
    contact: admissions,
    due: null,
    line: "Is there anything else I can help with? I've noted your enquiry for the team.",
    reasoning: ["Informational enquiry answered within provider rules; logged for admissions."],
    commitments: [],
  };
}

function emergencyDecision(c: Ctx): Decision {
  const onCall = contactByRole(c.provider, "on_call_manager");
  const manager = contactByRole(c.provider, "home_manager");
  const notify = onCall && onRota(onCall, c.t0) ? onCall : (manager ?? null);
  return {
    route: "emergency_redirect",
    contact: notify,
    due: c.t0,
    line: "If someone isn't breathing or is seriously hurt, please hang up and call 999 now. I'm alerting our manager as well.",
    reasoning: ["Medical emergency language: Eliza never triages; tells the caller to call 999 and ends."],
    commitments: ["Told caller to call 999", notify ? `Alerted ${notify.name}` : "No one to alert"],
  };
}

function safeguardingDecision(c: Ctx): Decision {
  const { provider, t0 } = c;
  const lead = contactById(provider, provider.rules.safeguardingLeadId);
  const onCall = contactByRole(provider, "on_call_manager");
  const target = lead && onRota(lead, t0) ? lead : onCall && onRota(onCall, t0) ? onCall : (lead ?? null);
  return {
    route: "safeguarding_escalation",
    contact: target,
    due: t0,
    line: `Thank you for telling me. What you've described needs a person straight away, so I'm escalating it to ${target ? firstName(target) : "the manager"} now. If anyone is in immediate danger, please call 999.`,
    reasoning: [
      "Possible safeguarding disclosure: stop qualifying, escalate to the safeguarding lead or whoever is on call.",
      target && target !== lead ? `${lead?.name ?? "Lead"} is off rota, so it goes to ${target.name}.` : "",
    ].filter(Boolean),
    commitments: [`Safeguarding escalation to ${target?.name ?? "manager"}`],
  };
}

const PRIORITY: Record<RouteKind, HandoffPacket["priority"]> = {
  emergency_redirect: "P0 now",
  safeguarding_escalation: "P0 now",
  warm_transfer: "P0 now",
  priority_callback: "P1 within the hour",
  standard_callback: "P2 same/next working day",
  contain_book_visit: "P2 same/next working day",
  contain_answer: "P3 FYI",
  redirect_non_enquiry: "P3 FYI",
};

function buildPacket(c: Ctx, d: Decision, commitments: string[]): HandoffPacket | null {
  if (d.route === "redirect_non_enquiry") return null;
  const s = c.slots;
  const isComplaint = has(c, "existing_resident") || has(c, "complaint");
  const required: [string, unknown][] =
    d.route === "emergency_redirect" || d.route === "safeguarding_escalation"
      ? [["phone", s.phone]]
      : isComplaint
        ? [["caller name", s.callerName], ["phone", s.phone]]
        : [["caller name", s.callerName], ["phone", s.phone], ["care type", s.careType], ["timeframe", s.timeframe]];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  const who = s.relationship ? `Caller's ${s.relationship}` : "Care recipient";
  const summaryBits = [
    isComplaint ? "Existing resident issue / complaint." : `${who}: ${s.careType ?? "care type not yet known"}.`,
    s.needs.length ? `Needs mentioned: ${s.needs.join(", ")}.` : "",
    s.timeframe ? `Timeframe: ${s.timeframe}.` : "",
    has(c, "distress") ? "Caller is distressed." : "",
    d.route === "safeguarding_escalation" ? "Possible safeguarding disclosure; read transcript before calling back." : "",
    d.route === "emergency_redirect" ? "Caller described a medical emergency and was told to call 999." : "",
  ].filter(Boolean);
  const open: string[] = [];
  if (has(c, "asked_price")) open.push("Confirm the actual weekly fee after assessment.");
  if (has(c, "clinical_question")) open.push(`Clinical assessment needed${s.needs.length ? ` (${s.needs.join(", ")})` : ""}.`);
  if (!s.funding && !isComplaint && d.route !== "emergency_redirect" && d.route !== "safeguarding_escalation")
    open.push("Funding route not discussed.");
  if (has(c, "asked_availability")) open.push("Confirm room availability; it may have changed.");
  return {
    routeTo: d.contact ? { name: d.contact.name, role: d.contact.role } : null,
    priority: PRIORITY[d.route],
    due: d.due === null ? null : toLocal(d.due),
    dueLabel: d.due === null ? "No deadline" : describeTime(d.due, c.t0),
    summary: summaryBits.join(" "),
    caller: { name: s.callerName, relationship: s.relationship, phone: s.phone },
    careRecipient: { careType: s.careType, needs: s.needs },
    timeframe: s.timeframe,
    funding: s.funding,
    source: sourceFor(c.provider, c.scenario.trackingNumber),
    channel: c.scenario.channel,
    elizaCommitments: commitments,
    openQuestions: open,
    flags: [...c.flags],
    missingFields: missing,
    completeness: required.length ? (required.length - missing.length) / required.length : 1,
  };
}

function mergeSlots(slots: Slots, found: ReturnType<typeof detect>) {
  for (const [k, v] of Object.entries(found.slots) as [keyof Omit<Slots, "needs">, string | undefined][]) {
    if (v && !slots[k]) (slots as unknown as Record<string, string>)[k] = v;
  }
  for (const n of found.needs) if (!slots.needs.includes(n)) slots.needs.push(n);
}

export function simulate(scenario: Scenario, provider: Provider, policyId: PolicyId): SimulationResult {
  const policy = POLICIES[policyId];
  if (!policy) throw new Error(`unknown policy ${policyId}`);
  const c: Ctx = {
    provider,
    policy,
    scenario,
    t0: toMinutes(scenario.startedAt),
    flags: new Set(),
    slots: { needs: [], phone: scenario.channel === "voice" ? scenario.callerNumber : undefined },
    violations: new Set(),
  };
  const trace: TurnTrace[] = [];
  const commitments: string[] = [];
  let decision: Decision | null = null;

  scenario.turns.forEach((turn, i) => {
    if (decision) return;
    const found = detect(turn, policy.safeguarding);
    const newFlags = found.flags.filter((f) => !c.flags.has(f));
    newFlags.forEach((f) => c.flags.add(f));
    mergeSlots(c.slots, found);
    const isLast = i === scenario.turns.length - 1;
    const parts: string[] = [];
    const reasoning: string[] = [];

    if (c.flags.has("emergency")) decision = emergencyDecision(c);
    else if (c.flags.has("safeguarding")) decision = safeguardingDecision(c);

    if (!decision) {
      if (newFlags.includes("distress")) parts.push("I'm really sorry, that sounds exhausting. You've done the right thing getting in touch.");
      if (newFlags.includes("asked_price") && !c.flags.has("non_enquiry")) {
        const line = priceLine(c);
        parts.push(line);
        if (/£/.test(line)) commitments.push(`Said: "${line}"`);
      }
      if (newFlags.includes("asked_availability")) {
        const line = availabilityLine(c);
        parts.push(line);
        if (!c.policy.respectsDisclosureRules) commitments.push(`Said: "${line}"`);
      }
      if (newFlags.includes("clinical_question")) {
        const line = clinicalLine(c);
        parts.push(line);
        if (!c.policy.clinicalGuard) commitments.push(`Said: "${line}"`);
      }
      if (isLast) decision = decide(c);
      else if (newFlags.includes("human_requested")) parts.push("Of course. Let me just check who's available.");
      else if (!c.flags.has("non_enquiry") && !c.flags.has("complaint") && !c.flags.has("existing_resident"))
        parts.push(followUp(c));
      else parts.push("I understand. Can you tell me a bit more?");
    }
    if (decision) {
      parts.push(decision.line);
      reasoning.push(...decision.reasoning);
    }
    if (newFlags.length) reasoning.unshift(`Detected: ${newFlags.join(", ")}.`);
    trace.push({ family: turn, newFlags, eliza: parts.join(" "), reasoning });
  });

  if (!decision) decision = decide(c);
  const d: Decision = decision;

  const truthSafeguarding = scenario.labels
    ? scenario.labels.expectedRoute === "safeguarding_escalation"
    : scenario.turns.some(detectsSafeguarding);
  if (truthSafeguarding && d.route !== "safeguarding_escalation" && d.route !== "emergency_redirect")
    c.violations.add("safeguarding_missed");

  const allCommitments = [...commitments, ...d.commitments];
  const packet = buildPacket(c, d, allCommitments);
  const violations = [...c.violations];
  const resolved = !c.violations.has("transfer_to_empty_rota") && !c.violations.has("unbacked_callback_promise");
  const nextStepRoutes: RouteKind[] = ["warm_transfer", "priority_callback", "standard_callback", "contain_book_visit"];
  const enquiryCaptured =
    resolved && nextStepRoutes.includes(d.route) && !!packet && !!packet.caller.phone;
  const l = policy.latency;
  return {
    scenarioId: scenario.id,
    policyId,
    route: d.route,
    routeLabel: ROUTE_LABELS[d.route],
    trace,
    packet,
    violations,
    resolved,
    enquiryCaptured,
    latency: { ...l, totalMs: l.sttEndpointMs + l.modelFirstTokenMs + l.ttsFirstAudioMs },
    flags: [...c.flags],
    slots: c.slots,
  };
}
