# PRD: Eliza Handoff Lab

**Prepared for:** Ayo Ahmed's application · **Status:** Audition prototype · **Last updated:** 28 Sep 2026

> This is an independent audition for Lottie's Senior Product Manager (Eliza) role. It is not Lottie's system, it uses no Lottie data, and it makes no claim about how Eliza performs today. Every provider, call and number in it is synthetic.

## 1. Problem statement

The [official posting](https://jobs.ashbyhq.com/lottie/a11d79e7-a108-4128-9666-7410707b428d) says **"a third of enquiries to care providers go unanswered"**. Its example: a family calls a home at 7pm and nobody picks up, or leaves a voicemail that is returned three days later, by which point they have moved on. The posting describes Eliza as the AI agent inside Found that answers calls and live chats on the provider's behalf, any time of day.

Answering the call is only the first step. The enquiry is **won or lost at the handoff**, when Eliza has to decide whether to deal with it herself or bring in a person. That decision depends on the provider's setup: who is on rota tonight, what they allow Eliza to say about fees, which home in the group has a room, and who handles safeguarding. The posting names this directly: *"Knowing when to hand over… so neither side drops the family in between."*

**Problem:** we have no shared, testable definition of a *good handoff* for a specific provider, at a specific time, on a specific channel. Without one:
- containment can look good while the wrong conversations are being contained;
- families can be promised callbacks or transfers the rota cannot deliver;
- a prompt or model change can quietly break safeguarding or disclosure rules, and we find out from a provider complaint.

## 2. Goal and non-goals

**Goal:** make handoff quality something we can **configure** (per provider rota and rules), **see** (per-turn reasoning and a handoff packet) and **gate** (a labelled eval set that blocks unsafe releases), so the team can ship prompt and model changes every week without breaking a provider's trust.

**Non-goals (for this prototype):**
- Building a voice agent, speech-to-text, text-to-speech or telephony. The latency figures are declared budgets, not measurements.
- Replacing an LLM. The policy engine is deterministic on purpose, so every decision can be checked. In production it would sit next to the model as guardrails and a routing layer, and act as the regression suite for it.
- Scoring conversation tone or empathy beyond simple rules.

## 3. Users

| User | What they need from a handoff |
| --- | --- |
| **Family / care seeker** (often an adult daughter or a spouse, often stressed, often out of hours) | To be listened to, get an honest next step with a time and a name, and never repeat their story. |
| **Care provider** (admissions lead, home manager, on-call manager) | Only the conversations that need them, with everything written down, and never a promise they cannot keep. |
| **Internal Lottie PM / Eliza team** | A way to see, measure and gate handoff behaviour before a release, and to onboard a new provider's phone setup in hours. |

More detail is in *Users, JTBD & stories*.

## 4. What the prototype does

1. **Provider setup:** a synthetic two-home group with a rota for admissions, home manager, clinical lead, reception and on-call. You can edit shifts, the price policy (no prices / "from £X" / exact), whether availability is shared, and what urgent out-of-hours calls do. Tracking numbers map to enquiry sources for attribution.
2. **Conversation lab:** run any of 15 labelled scenarios, or type your own, against three policy versions. You see every turn: what Eliza said, what she detected and why she chose the route. The output is a **handoff packet**: who, priority, due time checked against the rota, summary, commitments made, open questions and missing fields.
3. **Evals and release gate:** runs the labelled set across a baseline and a candidate. It reports containment, false containment, resolution, escalation recall and precision, enquiry capture, provider trust and safety-critical pass rate, then gives a **ship or block** decision with case-level regressions.
4. **Review queue:** a reviewer can agree or disagree with each case and leave a note. This is the human review loop the posting asks for, kept in the browser for now.
5. **Docs:** this PRD and the other product documents, shown in the app.

## 5. The three policies (an illustrative release decision)

| Policy | Idea | What the lab shows |
| --- | --- | --- |
| v1 Contain-first | Answer everything, always offer "a transfer" or "a call back within the hour". | Highest containment, and the least trustworthy. |
| v2 Handoff-aware | Checks the rota before promising, sends safeguarding and clinical questions to named people, follows the provider's disclosure rules, writes a packet. | Every labelled case routed correctly and zero violations. **Ship.** |
| v3 Fast path | v2 with a faster model and a keyword-only safeguarding check. | Half the declared latency to first audio (700 ms vs 1,400 ms), but misses an indirect safeguarding disclosure. **Blocked.** |

v3 is the kind of decision the posting describes (*"when a faster model is worth a slightly worse answer"*). The gate answers it: not when the worse answer is on a safety-critical path.

## 6. Requirements

| # | Requirement | Priority |
| --- | --- | --- |
| R1 | Emergency language always gets a 999 instruction and an alert to the manager. Eliza never triages. | Must |
| R2 | A possible safeguarding disclosure goes to the safeguarding lead, or whoever is on call, straight away, including indirect wording. | Must |
| R3 | Eliza never promises a transfer or a callback time that the rota cannot meet. | Must |
| R4 | Price and availability answers follow the provider's disclosure rules. If the primary home is full, Eliza offers a sister home that has space. | Must |
| R5 | Clinical capability questions go to a clinician. Eliza never says "yes, we can manage that". | Must |
| R6 | Existing-resident issues go to the home manager, not to sales. | Must |
| R7 | Every handoff produces a packet with an owner, a due time, a summary, commitments and missing fields. | Must |
| R8 | Non-enquiries (jobs, suppliers) are redirected and kept out of enquiry metrics. | Should |
| R9 | A release gate blocks any candidate that fails a safety-critical case, adds a trust violation, falsely contains a case or regresses beyond tolerance. | Must |
| R10 | Provider rota and rules can be edited without code (an onboarding proxy). | Should |
| R11 | A human reviewer can flag cases and leave notes. | Should |

## 7. Success metrics

Definitions are in *Metrics & evals*. In short:
- **North star:** enquiries that end with an honest, time-bound next step owned by a named person (*resolution × capture*).
- **Guardrails (zero tolerance):** safety-critical misses, trust violations, false containment.
- **Balance:** containment only counts alongside false containment. Containment on its own can be pushed up by containing the wrong conversations, and v1 shows this.

## 8. Assumptions, risks, open questions

Written down rather than guessed. See *Assumptions & open questions* and *Risks, pre-mortem & kill criteria*. The biggest assumption is that a meaningful share of lost enquiries are lost **at or after the handoff**, not only because the call was never answered. That needs checking with real transcripts before building further.

## 9. Release plan (if this were real)

1. Shadow mode: run v2 routing next to live Eliza on recorded transcripts and compare decisions. No family-facing change.
2. One friendly provider group: turn on rota-checked callbacks and packets. Measure missed callbacks and provider edits to packets.
3. Make the eval gate mandatory in CI for every prompt or model change.
4. Roll out further only if the kill criteria are not hit.
