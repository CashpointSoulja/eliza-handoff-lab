# Roadmap (3–6 months) and bets not taken

The posting asks for direction "3–6 months out" and for someone who "can explain the bets you didn't take as clearly as the ones you did".

## Now (weeks 0–4): learn before building more
- Callback-gap analysis on existing logs (tests A1).
- Rebuild the labelled set from about 200 real transcripts; add the review queue to the team's weekly rhythm.
- Make the release gate mandatory for every prompt or model change (safety and trust checks as hard blocks).
- Concierge-capture rota and rules for 3 friendly provider groups.

## Next (months 2–3): ship the handoff contract
- Rota-checked promises and urgent out-of-hours rules live for pilot groups.
- Handoff packet written into Found as a prioritised task, with SMS confirmation to the family.
- In chat, collect a contact alongside price and availability answers (closes the capture gap the lab shows).
- Self-serve config for account managers.

## Later (months 4–6): scale and infer
- Infer rota and escalation owners from call-tracking pickup data; ask providers to confirm rather than type.
- Per-provider eval slices so a change that's fine on average but bad for one group is caught.
- Latency work: parallel rules and model, streaming TTS, and a "fast model where safe" split by route.
- Conversation intelligence: which sources, times and intents convert, fed back to providers (attribution from tracking numbers).

## Bets not taken (and why)

| Bet | Why not now |
| --- | --- |
| **Maximise containment** as the headline goal | It rewards keeping calls that need a person. v1 in the lab is exactly this. Containment stays, but always paired with false containment. |
| **Ship the faster model everywhere** (v3) | Halving latency is real value, but not on a safety-critical path. Revisit per route: fast for price/availability, careful for anything with distress or risk. |
| **Let the LLM decide routing end to end** | Hard to test, hard to explain to providers, and changes silently with every model update. Use the model for understanding and language; keep routing rules explicit and gated. |
| **Premium voice cloning / persona work** | It matters, but "how Eliza sounds to a worried daughter at 9pm" is worth less than keeping the promise she makes. Tone work follows once the handoff is reliable. |
| **Build a new CRM view for handoffs** | Providers already live in Found. Put the packet where they work. |
| **Full IVR replacement for every provider** | Onboarding cost is the bottleneck. Start with rules capture, not new telephony. |
