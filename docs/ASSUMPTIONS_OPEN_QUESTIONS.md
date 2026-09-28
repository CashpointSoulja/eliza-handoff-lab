# Assumptions and open questions

Eliza's real containment, escalation and failure rates are unknown here. This page lists what the prototype assumes, how confident we can be, and what to ask on day one. The only external figure used is the posting's "a third of enquiries to care providers go unanswered".

## Assumptions (ranked by risk × uncertainty)

| # | Assumption | Risk type | Confidence | Cheapest test |
| --- | --- | --- | --- | --- |
| A1 | A meaningful share of enquiries Eliza answers are still lost **at or after handoff**: late or missed callbacks, dead transfers, missing context. | Value | Low–medium | Join Eliza call logs to call-tracking callback events for 2 weeks and measure the promised vs. actual callback gap. |
| A2 | Providers will keep a structured rota and rules current if it is quick to edit and visibly changes routing. | Usability / viability | Low | Concierge test: onboarding writes the config for 3 groups and we count how many edits providers make unprompted in 30 days. |
| A3 | Families accept an honest "nobody is in until 9am; Priya will call you at 9:00" more than a vague "someone will call you back soon". | Value | Medium | A/B the closing line on non-urgent out-of-hours calls; compare callback answer rate and conversion. |
| A4 | Indirect safeguarding disclosures happen often enough to matter, and keyword checks miss them. | Feasibility / safety | Medium | Label 200 real transcripts for safeguarding with a care-sector reviewer, then compare keyword and model classifiers. |
| A5 | A deterministic routing layer next to the LLM is acceptable for latency (under ~100 ms added). | Feasibility | Medium–high | Instrument the rules step in the live stack. |
| A6 | Chat enquiries that don't leave a contact are a large lost-lead bucket. | Value | Medium | Count chat sessions with a price or availability question and no contact captured. |
| A7 | Providers see "wrong price quoted" and "promised a room we don't have" as trust-breaking, not minor. | Viability | High | 5 provider interviews ranking failure types. |
| A8 | The labelled set can be kept representative with ~1 hour of review per week. | Feasibility | Medium | Time the first month of review-queue work. |

## Open questions for the Eliza team

**Conversation and handoff**
1. What does a handoff look like in production today: live transfer, callback task, CRM note in Found, SMS?
2. How is "unanswered" measured: no pickup, voicemail, abandoned IVR, or no callback within X hours?
3. What share of Eliza conversations end in a human handoff, and how many of those get a human response within the promised time?
4. Who owns safeguarding escalations at a typical provider, and is there a Lottie-side policy on what Eliza must do?

**Provider setup and onboarding**
5. How are rotas and out-of-hours cover represented now: in Found, in a spreadsheet, or in the phone system?
6. What is the long tail of phone setups: forwarding, overflow, hunt groups, multiple sites on one number?
7. What decides time-to-live today: telephony, CRM integration, or rules capture?

**Quality and evals**
8. Is there already a labelled call set? Who labels it, and how often is it refreshed from real transcripts?
9. What are the current release gates for prompt and model changes, and what has slipped through before?
10. How are latency budgets split across STT, model and TTS, and where is the p95 today?

**Commercial**
11. How does Eliza connect to occupancy outcomes in Found (enquiry → visit → admission)?
12. Which metric do providers actually look at: answered rate, leads, visits, or admissions?

## What would change the plan
- If A1 is false (handoffs are already reliable and the loss is before the call is answered), the priority moves to **coverage and pickup**: more numbers routed to Eliza, faster provisioning. This lab becomes a regression tool rather than a product bet.
- If A2 is false (providers won't maintain config), rules need to be **inferred** from call-tracking data (who actually picks up, when) instead of entered by hand.
