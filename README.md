# Eliza Handoff Lab

A working lab for one product question: **when should an AI agent hand a care enquiry to a person, and does the person it hands to actually exist at that hour?**

> **Independent audition prototype for Ayo Ahmed's application** to Lottie's [Senior Product Manager (Eliza)](https://jobs.ashbyhq.com/lottie/a11d79e7-a108-4128-9666-7410707b428d) role. This is not Lottie's system. It uses no Lottie data and makes no claim about how Eliza performs today. Every provider, call, phone number and metric here is synthetic.
>
> **Who made it:** the code and the first drafts of the product docs were produced by Devin (an AI agent) at Ayo's direction, for Ayo's review. They are not presented as Ayo's unaided work.

## Product docs (start here)
These docs are also shown in the app under **Product docs**.

| Doc | What it covers |
| --- | --- |
| [PRD](docs/PRD.md) | Problem grounded in the posting, goals, non-goals, requirements, success metrics |
| [5 Whys](docs/FIVE_WHYS.md) | Hypothesised root cause of lost enquiries: there is no shared, testable definition of a good handoff |
| [Users, JTBD & stories](docs/USERS_JTBD_STORIES.md) | Family, provider and internal PM; jobs-to-be-done; user stories with acceptance criteria |
| [Assumptions & open questions](docs/ASSUMPTIONS_OPEN_QUESTIONS.md) | What the prototype assumes, how to test it cheaply, and what to ask the Eliza team |
| [Opportunity & impact vs effort](docs/OPPORTUNITY_PRIORITISATION.md) | Opportunity solution tree, impact/effort, illustrative RICE, Kano |
| [Metrics & evals](docs/METRICS_AND_EVALS.md) | Metric tree, definitions, release gate, human review loop |
| [Risks, pre-mortem & kill criteria](docs/RISKS_PREMORTEM_KILL_CRITERIA.md) | What could go wrong and when to stop |
| [Roadmap & bets not taken](docs/ROADMAP.md) | Now / next / later |
| [5-minute demo script](docs/DEMO_SCRIPT.md) | How to walk through the lab |

## What the app does
- **Conversation lab:** run 15 labelled synthetic voice/chat enquiries (or write your own) through three policy versions side by side. See what Eliza said each turn and why, the route it chose, any provider-trust violations, and the handoff packet the provider team would receive.
- **Provider setup:** edit rotas, price and availability disclosure rules, out-of-hours routing and safeguarding lead. The weekly coverage grid shows who is actually reachable. Changes flow straight into the lab and evals.
- **Evals & release gate:** score a candidate policy against a baseline policy on the labelled set (containment, false containment, resolution, escalation recall/precision, enquiry capture, provider trust, safety-critical pass, packet completeness, declared latency). Hard gates block a ship. Reviewers can agree, flag a label as wrong or flag Eliza as wrong, add a note and export their reviews. Reviews do not change the labels.

The three policies tell one story:
- **v1, contain-first:** highest containment, but it quotes internal prices, promises rooms, transfers to empty rotas and misses safeguarding.
- **v2, handoff-aware:** rota-aware, rule-aware, routes safeguarding and clinical questions to named people. It passes every labelled case.
- **v3, fast path:** 700 ms faster, but its lighter safeguarding check misses an indirect disclosure (S04). The gate blocks it.

The engine is deterministic and rule-based so that every decision is traceable and the demo needs no API key. It stands in for the model; the product surface under test is the handoff contract, not the model.

## Run locally
```bash
npm ci
npm run dev        # wrangler dev → http://localhost:8787
npm test           # vitest
npm run typecheck
npm run eval       # prints the policy comparison; exits 1 if v2 fails its gate
```

## API
- `GET /api/health`
- `GET /api/meta`: policies, scenarios, sample provider, labels
- `POST /api/simulate` with `{ policy, scenarioId | scenario, provider? }`
- `POST /api/eval` with `{ baseline, candidate, provider? }`
- `GET /api/docs`, `GET /api/docs/:slug`

## Deploy (Cloudflare)
`npx wrangler deploy`. Static assets are served from `public/`; markdown docs are bundled into the Worker.

## Licence
MIT. `public/vendor/marked.esm.js` is [marked](https://github.com/markedjs/marked) (MIT, licence alongside).
