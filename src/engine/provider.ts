import type { Contact, Provider, Role, RotaWindow } from "./types";

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Entirely synthetic two-home group. Numbers are Ofcom drama-range numbers. */
export const SAMPLE_PROVIDER: Provider = {
  id: "harbour-lane",
  name: "Willow Bank House",
  group: "Harbour Lane Care Group (synthetic)",
  primaryHomeId: "willow-bank",
  homes: [
    {
      id: "willow-bank",
      name: "Willow Bank House",
      careTypes: ["residential", "dementia", "respite", "nursing"],
      vacancies: { residential: 2, dementia: 0, respite: 1, nursing: 1 },
    },
    {
      id: "harbour-view",
      name: "Harbour View (sister home, 4 miles away)",
      careTypes: ["residential", "dementia"],
      vacancies: { residential: 0, dementia: 1 },
    },
  ],
  contacts: [
    { id: "priya", name: "Priya (Admissions)", role: "admissions", rota: [{ days: WEEKDAYS, start: "09:00", end: "17:30" }] },
    { id: "tom", name: "Tom (Home Manager)", role: "home_manager", rota: [{ days: WEEKDAYS, start: "08:00", end: "18:00" }] },
    { id: "grace", name: "Grace (Clinical Lead, RGN)", role: "clinical_lead", rota: [{ days: [1, 2, 3, 4], start: "09:00", end: "17:00" }] },
    { id: "reception", name: "Reception desk", role: "reception", rota: [{ days: EVERY_DAY, start: "08:00", end: "20:00" }] },
    {
      id: "on-call",
      name: "On-call manager",
      role: "on_call_manager",
      rota: [
        { days: WEEKDAYS, start: "18:00", end: "08:00" },
        { days: [0, 6], start: "00:00", end: "23:59" },
      ],
    },
  ],
  rules: {
    pricePolicy: "from_price",
    fromPriceWeekly: 1250,
    internalWeeklyRates: { residential: 1380, dementia: 1520, nursing: 1690, respite: 1450 },
    discloseAvailability: true,
    urgentOutOfHours: "on_call",
    priorityCallbackMinutes: 30,
    safeguardingLeadId: "tom",
  },
  tracking: [
    { number: "0161 496 0101", source: "Care marketplace profile" },
    { number: "0161 496 0102", source: "Provider website" },
    { number: "0161 496 0103", source: "Google Business Profile" },
    { number: "0161 496 0104", source: "Hospital discharge team leaflet" },
    { number: "chat-widget", source: "Website live chat" },
  ],
};

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Minutes since the Unix epoch, treating the UK-local string as if it were UTC (no DST maths needed). */
export function toMinutes(local: string): number {
  const ms = Date.parse(`${local.length === 16 ? local : local.slice(0, 16)}:00Z`);
  if (Number.isNaN(ms)) throw new Error(`invalid time "${local}" (expected YYYY-MM-DDTHH:MM)`);
  return Math.floor(ms / 60_000);
}

export function toLocal(minutes: number): string {
  return new Date(minutes * 60_000).toISOString().slice(0, 16);
}

const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

function inWindow(w: RotaWindow, day: number, minuteOfDay: number): boolean {
  const start = hm(w.start);
  const end = hm(w.end);
  if (start <= end) return w.days.includes(day) && minuteOfDay >= start && minuteOfDay <= end;
  const prev = (day + 6) % 7;
  return (w.days.includes(day) && minuteOfDay >= start) || (w.days.includes(prev) && minuteOfDay < end);
}

export function onRota(contact: Contact, minutes: number): boolean {
  const d = new Date(minutes * 60_000);
  const day = d.getUTCDay();
  const mod = d.getUTCHours() * 60 + d.getUTCMinutes();
  return contact.rota.some((w) => inWindow(w, day, mod));
}

/** Earliest minute (15-minute resolution) at or after `from` that the contact is on rota, within 8 days. */
export function nextOnRota(contact: Contact, from: number): number | null {
  if (onRota(contact, from)) return from;
  const start = Math.ceil(from / 15) * 15;
  for (let t = start; t < from + 8 * 24 * 60; t += 15) if (onRota(contact, t)) return t;
  return null;
}

export function contactByRole(p: Provider, role: Role): Contact | undefined {
  return p.contacts.find((c) => c.role === role);
}

export function contactById(p: Provider, id: string): Contact | undefined {
  return p.contacts.find((c) => c.id === id);
}

export function describeTime(target: number, from: number): string {
  const diff = target - from;
  const d = new Date(target * 60_000);
  const clock = `${DAY_NAMES[d.getUTCDay()]} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  if (diff <= 0) return `now (${clock})`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${clock} (in ${h ? `${h}h ` : ""}${m}m)`;
}

export function sourceFor(p: Provider, trackingNumber: string): string {
  return p.tracking.find((t) => t.number === trackingNumber)?.source ?? "Unattributed number";
}

/** Rejects configs the engine cannot reason about. Returns a list of problems (empty = valid). */
export function validateProvider(p: Provider): string[] {
  const problems: string[] = [];
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!p || !Array.isArray(p.contacts) || !Array.isArray(p.homes)) return ["provider must include contacts and homes"];
  for (const c of p.contacts) {
    for (const w of c.rota ?? []) {
      if (!time.test(w.start) || !time.test(w.end)) problems.push(`${c.name}: rota times must be HH:MM`);
      if (!Array.isArray(w.days) || w.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
        problems.push(`${c.name}: rota days must be 0–6`);
    }
  }
  if (!contactById(p, p.rules?.safeguardingLeadId)) problems.push("safeguarding lead must be one of the contacts");
  if (!p.homes.some((h) => h.id === p.primaryHomeId)) problems.push("primary home must be one of the homes");
  return problems;
}
