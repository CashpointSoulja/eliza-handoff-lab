import type { CareType, Flag, Slots } from "./types";

export type SafeguardingClassifier = "none" | "lite" | "full";

const R = {
  emergency:
    /\b(not breathing|can'?t breathe|stopped breathing|struggling to breathe|unconscious|unresponsive|chest pains?|collapsed|won'?t wake up|bleeding heavily|having a stroke)\b/,
  safeguardingFull:
    /\b(abuse|abused|abusing|neglect|neglected|safeguarding|bruis\w*|frightened of|scared of|afraid of|hit(s|ting)? (her|him|me)|slap\w*|shout(s|ing)? at (her|him)|taking (her|his) money|stealing from|left (her|him) (alone|unattended|in wet))\b/,
  safeguardingLite: /\b(abuse|abused|abusing|neglect|neglected|safeguarding)\b/,
  existingResident:
    /\b(is a resident|already (lives|living|staying)|currently (lives|living|staying)|living with you|staying with you|lives with you)\b/,
  complaint: /\b(complain\w*|not happy with|unhappy with|keeps going missing|went missing|unacceptable)\b/,
  human:
    /\b((speak|talk) to (a |an )?(real |actual )?(person|human|someone|somebody|manager|member of staff)|real person|human being|not a (robot|machine)|are you a robot)\b/,
  clinicalTerm:
    /\b(peg|feeding tube|catheter|insulin|oxygen|tracheostomy|pressure (sore|ulcer)s?|end of life|palliative|syringe driver|hoist|stoma|dialysis|challenging behaviour)\b/,
  capabilityAsk: /\b(can you|could you|do you|are you able|able to|would you be able|will you)\b/,
  price: /\b(how much|cost|costs|price|prices|fees?|weekly rate|per week|afford)\b/,
  availability: /\b(rooms?|vacanc\w*|availability|available|space|spaces|beds?)\b/,
  urgent:
    /\b(discharg\w*|being sent home|this week|tomorrow|today|tonight|by (monday|tuesday|wednesday|thursday|friday|the weekend)|asap|as soon as possible|urgent\w*|emergency placement|in (a|two|2|a few) days)\b/,
  distress:
    /\b(can'?t cope|cannot cope|end of my tether|wits'? end|exhausted|desperate|breaking down|in tears|crying|don'?t know what (else )?to do)\b/,
  nonEnquiry:
    /\b(apply(ing)? for|job|jobs|work(ing)? (here )?as a carer|my cv|recruit\w*|supplier|we sell|selling|marketing|seo|energy (deal|contract)|partnership opportunity)\b/,
  visit: /\b(visit|look round|look around|come round|come and see|tour|show (me|us) round|viewing)\b/,
  callback: /\b(call me back|ring me|phone me|callback|call back|give me a call|someone (to )?call me|get back to me)\b/,
  relationship:
    /\bmy (mum|mother|dad|father|husband|wife|partner|nan|gran|grandmother|grandad|grandfather|aunt|uncle|brother|sister|mother-in-law|father-in-law)\b/,
  needs:
    /\b(dementia|alzheimer'?s|parkinson'?s|falls?|fell|falling|diabetes|stroke|mobility|wheelchair|peg|feeding tube|catheter|incontinen\w*|hoist|confused|wandering|oxygen|insulin)\b/g,
  timeframe:
    /\b((on|by|this) (mon|tues|wednes|thurs|fri|satur|sun)day|this week|tomorrow|today|tonight|by \w+day|asap|as soon as possible|in (a|one|two|three|a few|a couple of|\d+) (days?|weeks?|months?)|next (week|month)|in the next (few )?(weeks|months)|just researching|no rush|not urgent)\b/,
  funding:
    /\b(self[- ]fund\w*|privately|pay ourselves|council|local authority|social services|chc|continuing healthcare|nhs funded|sell(ing)? (her|his|the) house)\b/,
  phone: /(\+44\s?\d{2,4}|\b0\d{2,4})[\s-]?\d{3}[\s-]?\d{3,4}\b/,
  name: /(?:[Mm]y name is|[Mm]y name'?s|\bI'?m|\bI am|[Tt]his is|[Ii]t'?s) ([A-Z][a-z]+)\b/,
};

const NOT_NAMES = new Set([
  "Just", "Calling", "Looking", "Ringing", "So", "Not", "Really", "Worried", "Trying", "Afraid", "Here", "Sorry",
  "Phoning", "After", "The", "About", "Wondering", "Interested", "Still", "Very", "Quite", "Getting",
]);

function careTypeOf(t: string): CareType | undefined {
  if (/\b(respite|short stay|short-term stay|a break)\b/.test(t)) return "respite";
  if (/\b(dementia|alzheimer'?s|memory care)\b/.test(t)) return "dementia";
  if (/\b(nursing|nurse|peg|feeding tube|tracheostomy|syringe driver)\b/.test(t)) return "nursing";
  if (/\b(residential|care home|assisted living|a home for|help with washing|help getting dressed)\b/.test(t)) return "residential";
  return undefined;
}

function fundingOf(t: string): string | undefined {
  const m = t.match(R.funding)?.[0];
  if (!m) return undefined;
  if (/chc|continuing healthcare|nhs/.test(m)) return "NHS Continuing Healthcare (to confirm)";
  if (/council|local authority|social services/.test(m)) return "Local authority funded (to confirm)";
  return "Self-funding";
}

export interface Detection {
  flags: Flag[];
  slots: Partial<Omit<Slots, "needs">>;
  needs: string[];
}

export function detect(text: string, safeguarding: SafeguardingClassifier): Detection {
  const t = text.toLowerCase();
  const flags: Flag[] = [];
  const add = (f: Flag, on: boolean) => on && flags.push(f);
  const nonEnquiry = R.nonEnquiry.test(t);
  add("emergency", R.emergency.test(t));
  add(
    "safeguarding",
    safeguarding === "full" ? R.safeguardingFull.test(t) : safeguarding === "lite" ? R.safeguardingLite.test(t) : false,
  );
  add("existing_resident", R.existingResident.test(t));
  add("complaint", R.complaint.test(t));
  add("human_requested", R.human.test(t));
  add("clinical_question", R.clinicalTerm.test(t) && R.capabilityAsk.test(t));
  add("asked_price", R.price.test(t));
  add("asked_availability", !nonEnquiry && R.availability.test(t));
  add("urgent_timeline", R.urgent.test(t));
  add("distress", R.distress.test(t));
  add("non_enquiry", nonEnquiry);
  add("wants_visit", R.visit.test(t));
  add("wants_callback", R.callback.test(t));

  const name = text.match(R.name)?.[1];
  const slots: Detection["slots"] = {
    callerName: name && !NOT_NAMES.has(name) ? name : undefined,
    relationship: t.match(R.relationship)?.[1],
    careType: careTypeOf(t),
    timeframe: t.match(R.timeframe)?.[0],
    funding: fundingOf(t),
    phone: text.match(R.phone)?.[0],
  };
  const needs = [...new Set([...t.matchAll(R.needs)].map((m) => m[0].replace(/^(fell|fall|falling)$/, "falls")))];
  return { flags, slots, needs };
}

/** The strongest classifier, used as ground truth for "safeguarding missed" when a scenario has no label. */
export const detectsSafeguarding = (text: string) => R.safeguardingFull.test(text.toLowerCase());
