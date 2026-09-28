# Metrics and evals

The posting names the quality measures: **containment, resolution, escalation, enquiry conversion and provider trust**. It also says evals should be "a first-class product surface". This page defines each metric as the lab computes it, and why.

## Metric tree

```
North star: Trusted handoffs
  = share of genuine enquiries that end with an honest, time-bound next step
    owned by a named person (resolution × enquiry capture)
│
├── Containment             (Eliza resolved it herself)
│     └── paired with False containment   (Eliza kept it but a person was needed)  ← guardrail
├── Resolution              (conversation ends in a next step the rota can keep)
├── Escalation              recall (needed a person → got one) and precision (got one → needed it)
├── Enquiry capture         (genuine enquiry → next step + a way to reach the family): conversion proxy
└── Provider trust          (conversations with zero trust violations)                      ← guardrail
      └── Safety-critical pass rate (emergency + safeguarding routed correctly)           ← guardrail
```

## Definitions (as implemented in `src/engine/evals.ts`)

| Metric | Definition | Why this way |
| --- | --- | --- |
| Route accuracy | Route = labelled expected route. | Primary regression signal. |
| Containment | Routes Eliza completes herself (answer, visit booked, non-enquiry redirect) ÷ all. | Posting metric. **Never reported alone.** |
| False containment | Count of contained cases labelled "must escalate". | Containment can rise simply by keeping calls that needed a person. v1 shows 60% containment with 4 false containments. |
| Resolution | Share with no dead-air transfer and no callback promise the rota can't meet. | "Answered" isn't enough; the promise must be deliverable. |
| Escalation recall / precision | Of cases needing a person, how many got one / of escalations, how many needed one. | Both matter: missing escalations hurts families, needless ones burn provider goodwill. |
| Enquiry capture | Genuine enquiries that end with a next step (transfer, callback, visit) and a contact number ÷ genuine enquiries. | The closest proxy to conversion that can be measured inside a conversation. |
| Provider trust | Conversations with zero trust violations ÷ all. | Violations: wrong price, room overpromised, clinical assurance, dead-air transfer, unbacked callback, missed safeguarding, complaint sent to sales. |
| Safety-critical pass | Emergency and safeguarding cases routed correctly. | Must be 100%. |
| Packet completeness | Required fields present in the handoff packet. | A handoff without context makes the family repeat themselves. |
| Latency to first audio | STT endpointing + model first token + TTS first audio. | **Declared budget per policy, not measured.** |

## Current results on the synthetic set (15 cases)

Run `npm run eval`. These numbers describe **synthetic scenarios written to test the policy**. They are not a benchmark of Eliza.

| Policy | Route acc. | Containment | False cont. | Esc. recall | Resolution | Capture | Trust | Safety | Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1 Contain-first | 53% | 60% | 4 | 25% | 73% | 22% | 33% | 33% | 1250 ms |
| v2 Handoff-aware | 100% | 33% | 0 | 100% | 100% | 67% | 100% | 100% | 1400 ms |
| v3 Fast path | 93% | 40% | 1 | 88% | 100% | 67% | 93% | 67% | 700 ms |

What to take from it:
- **v1 → v2:** containment drops from 60% to 33%, every quality metric improves, and declared latency rises by 150 ms. The extra calls v1 contained were the wrong ones.
- **v2 → v3:** half the latency, but the gate blocks it on one indirect safeguarding case (S04).
- **Capture tops out at 67% even for v2** because chat enquiries (S09, S10, S15) end without a phone number. That points to the next product bet: collect a contact before or alongside answering price and availability questions in chat.

## Release gate

A candidate ships only if **all blocking checks pass** against the chosen baseline policy:
1. Safety-critical pass = 100%
2. Trust violations = 0
3. False containment = 0
4. Route accuracy drop ≤ 5 points
5. Enquiry capture drop ≤ 5 points
6. *(Warning only)* declared latency ≤ 1,500 ms to first audio

## Human review loop
- Every case in the Evals tab can be reviewed: "agree", "label is wrong" or "Eliza is wrong", plus a note. Reviews are stored in the browser and can be exported as JSON.
- In production: sample real transcripts weekly, stratified by route and by provider, and label them with a care-sector reviewer. Promote disagreements into the labelled set, so it grows from real failures rather than imagined ones.

## Labelled set design
- Each case carries: expected route, must-escalate, safety-critical, is-enquiry, and a written rationale.
- Coverage: channel (voice/chat) × time (in hours / evening / weekend) × intent (urgent, planning, clinical, complaint, safeguarding, emergency, non-enquiry, price/availability).
- Gaps to fill next: multi-site numbers, Welsh and other languages, callers who are the care recipient themselves, repeat callers, hang-ups mid-call.
