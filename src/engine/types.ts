export type Channel = "voice" | "chat";
export type CareType = "residential" | "nursing" | "dementia" | "respite";
export type Role = "admissions" | "home_manager" | "clinical_lead" | "reception" | "on_call_manager";

/** Days are 0 = Sunday … 6 = Saturday. A window whose end is before its start runs past midnight. */
export interface RotaWindow {
  days: number[];
  start: string;
  end: string;
}

export interface Contact {
  id: string;
  name: string;
  role: Role;
  rota: RotaWindow[];
}

export interface Home {
  id: string;
  name: string;
  careTypes: CareType[];
  vacancies: Partial<Record<CareType, number>>;
}

export interface ProviderRules {
  pricePolicy: "no_prices" | "from_price" | "exact";
  fromPriceWeekly: number;
  /** Internal rates; only ever said aloud when pricePolicy is "exact". */
  internalWeeklyRates: Partial<Record<CareType, number>>;
  discloseAvailability: boolean;
  urgentOutOfHours: "on_call" | "next_business_morning";
  priorityCallbackMinutes: number;
  safeguardingLeadId: string;
}

export interface TrackingNumber {
  number: string;
  source: string;
}

export interface Provider {
  id: string;
  name: string;
  group: string;
  primaryHomeId: string;
  homes: Home[];
  contacts: Contact[];
  rules: ProviderRules;
  tracking: TrackingNumber[];
}

export type RouteKind =
  | "contain_answer"
  | "contain_book_visit"
  | "redirect_non_enquiry"
  | "standard_callback"
  | "priority_callback"
  | "warm_transfer"
  | "safeguarding_escalation"
  | "emergency_redirect";

export const ROUTE_LABELS: Record<RouteKind, string> = {
  contain_answer: "Contained: answered",
  contain_book_visit: "Contained: visit booked",
  redirect_non_enquiry: "Redirected (not a care enquiry)",
  standard_callback: "Scheduled callback",
  priority_callback: "Priority callback",
  warm_transfer: "Warm transfer to a person",
  safeguarding_escalation: "Safeguarding escalation",
  emergency_redirect: "Emergency: told to call 999",
};

export const CONTAINED_ROUTES: RouteKind[] = ["contain_answer", "contain_book_visit", "redirect_non_enquiry"];
export const ESCALATION_ROUTES: RouteKind[] = [
  "warm_transfer",
  "priority_callback",
  "safeguarding_escalation",
  "emergency_redirect",
];

export interface ScenarioLabels {
  expectedRoute: RouteKind;
  /** A person must be involved now or today. */
  mustEscalate: boolean;
  /** Getting the route wrong could put someone at risk. */
  safetyCritical: boolean;
  /** A genuine enquiry about care (counts towards enquiry capture). */
  isEnquiry: boolean;
  rationale: string;
}

export interface Scenario {
  id: string;
  title: string;
  channel: Channel;
  /** UK local time, "YYYY-MM-DDTHH:MM". */
  startedAt: string;
  /** Tracking number dialled / chat widget source. */
  trackingNumber: string;
  /** Caller line identity for voice; chat has none unless the family types it. */
  callerNumber?: string;
  turns: string[];
  labels?: ScenarioLabels;
}

export type TrustViolation =
  | "price_disclosed_against_rules"
  | "availability_overpromised"
  | "clinical_assurance_given"
  | "transfer_to_empty_rota"
  | "unbacked_callback_promise"
  | "safeguarding_missed"
  | "complaint_routed_to_sales";

export const VIOLATION_LABELS: Record<TrustViolation, string> = {
  price_disclosed_against_rules: "Quoted a price the provider does not allow Eliza to share",
  availability_overpromised: "Promised a room that is not available",
  clinical_assurance_given: "Confirmed a clinical need can be met without a clinician",
  transfer_to_empty_rota: "Transferred to a line with nobody on rota (dead air)",
  unbacked_callback_promise: "Promised a callback time nobody on rota can meet",
  safeguarding_missed: "Missed a safeguarding disclosure",
  complaint_routed_to_sales: "Sent an existing-resident complaint to the sales team",
};

export type Flag =
  | "emergency"
  | "safeguarding"
  | "existing_resident"
  | "complaint"
  | "human_requested"
  | "clinical_question"
  | "asked_price"
  | "asked_availability"
  | "urgent_timeline"
  | "distress"
  | "non_enquiry"
  | "wants_visit"
  | "wants_callback";

export interface Slots {
  callerName?: string;
  relationship?: string;
  careType?: CareType;
  needs: string[];
  timeframe?: string;
  funding?: string;
  phone?: string;
}

export interface TurnTrace {
  family: string;
  newFlags: Flag[];
  eliza: string;
  reasoning: string[];
}

export interface HandoffPacket {
  routeTo: { name: string; role: Role } | null;
  priority: "P0 now" | "P1 within the hour" | "P2 same/next working day" | "P3 FYI";
  due: string | null;
  dueLabel: string;
  summary: string;
  caller: { name?: string; relationship?: string; phone?: string };
  careRecipient: { careType?: CareType; needs: string[] };
  timeframe?: string;
  funding?: string;
  source: string;
  channel: Channel;
  elizaCommitments: string[];
  openQuestions: string[];
  flags: Flag[];
  missingFields: string[];
  completeness: number;
}

export interface LatencyBudget {
  sttEndpointMs: number;
  modelFirstTokenMs: number;
  ttsFirstAudioMs: number;
}

export interface SimulationResult {
  scenarioId: string;
  policyId: string;
  route: RouteKind;
  routeLabel: string;
  trace: TurnTrace[];
  packet: HandoffPacket | null;
  violations: TrustViolation[];
  resolved: boolean;
  enquiryCaptured: boolean;
  latency: LatencyBudget & { totalMs: number };
  flags: Flag[];
  slots: Slots;
}
