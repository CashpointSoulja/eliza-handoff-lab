# Risks, pre-mortem and kill criteria

## Pre-mortem: "It's six months later and the handoff work failed. Why?"

| Failure story | Likelihood | Early signal | Mitigation |
| --- | --- | --- | --- |
| Providers never kept rota and rules current, so promises went stale and trust dropped. | Medium–high | Config edits fall to zero after onboarding; callback misses climb. | Infer rota from call-tracking pickup data; prompt weekly "is this still right?" check-ins; fall back to vaguer but honest promises when the config is stale. |
| The gate became a bottleneck and the team started bypassing it to ship. | Medium | Gate overrides; labelled set older than 4 weeks. | Keep the set small and sharp; nightly runs; only safety and trust checks are hard blocks. |
| The labelled set didn't match reality. We optimised for 15 imagined calls. | High (for this prototype) | Review queue disagreement rate > 20%. | Rebuild the set from real transcripts in week one; stratify by provider. |
| Honest "nobody until 9am" lines lowered conversion vs. vague reassurance. | Low–medium | A/B shows lower callback answer rate. | Test wording; add SMS confirmation; test offering a visit booking in the same breath. |
| Safeguarding over-triggered and woke on-call managers for nothing. | Medium | On-call complaints; escalation precision < 70%. | Tune with care-sector reviewers; tiered escalation (P0 call vs. P1 task). |
| Rules layer added latency and made voice feel slow. | Low | p95 first-audio regression. | Run rules in parallel with the model; cache provider config per call. |

## Risk register (value, usability, feasibility, viability)

| Risk | Type | Current evidence | Next test |
| --- | --- | --- | --- |
| Handoff isn't where enquiries are lost | Value | None (assumption A1) | Callback-gap analysis on logs |
| Providers won't maintain config | Usability / viability | None (A2) | Concierge onboarding with 3 groups |
| Deterministic rules miss nuance an LLM would catch | Feasibility | S04 shows keyword checks miss it; the v2 pattern list is also finite | Classifier comparison on labelled real transcripts |
| Commercial value unclear | Viability | Posting links Eliza to occupancy | Tie captured enquiries to visits and admissions in Found |

## Kill or pivot criteria (decided before building further)

Stop or change direction if, after a 4-week pilot with one group:
1. **Callback-gap analysis** shows fewer than 10% of handed-off enquiries miss their promised response. The handoff isn't the leak, so pivot to coverage and pickup.
2. **Providers edit the config fewer than once a month** and it drifts from reality. Pivot to inferred rota.
3. **Enquiry → visit conversion** for pilot calls isn't at least flat against control. Honesty is costing conversions, so re-test the wording before scaling.
4. **Escalation precision below 60%**: we're burning provider goodwill faster than we're saving families.

## Ethical and safety notes
- Eliza should never give clinical, legal or financial advice. She routes.
- Emergencies always get a 999 instruction first. The lab treats this as non-negotiable across every policy, including the baseline.
- Transcripts involve vulnerable people. A real review loop needs consent, retention limits and restricted access.
