# Opportunity, impact vs effort, and prioritisation

## Opportunity solution tree

**Outcome:** more enquiries end with an honest, time-bound next step owned by a named person (and so, eventually, more visits and admissions).

```
Outcome: every enquiry answered AND handed off well
├── O1 Families get a next step the provider can actually keep
│   ├── S1 Rota-checked promises (transfer / callback time)        ← built
│   ├── S2 Provider rule for urgent out-of-hours (on-call vs AM)   ← built
│   └── S3 SMS confirmation with name + time                        (next)
├── O2 Providers only get what needs them, with context
│   ├── S4 Handoff packet with owner, priority, due, open questions ← built
│   ├── S5 Complaint and non-enquiry routing                        ← built
│   └── S6 Packet written into Found as a task                      (next)
├── O3 Nothing unsafe or trust-breaking gets through
│   ├── S7 Safeguarding and emergency paths                         ← built
│   ├── S8 Disclosure rules for price, availability, clinical       ← built
│   └── S9 Release gate on a labelled set                           ← built
└── O4 Onboarding in hours, not weeks
    ├── S10 Editable rota/rules config                              ← built (prototype)
    └── S11 Infer rota from call-tracking pickup data               (later)
```

## Impact vs effort

Scores are my estimates from the posting and general contact-centre experience, not Lottie data. Impact is on trusted handoffs; effort is relative engineering and ops effort.

| Solution | Impact | Effort | Quadrant |
| --- | --- | --- | --- |
| S1 Rota-checked promises | High | Low | **Quick win** |
| S7 Safeguarding / emergency paths | High (risk) | Low | **Quick win** |
| S8 Disclosure rules | High (trust) | Low | **Quick win** |
| S9 Release gate on labelled set | High | Medium | **Big bet: do now** |
| S4 Handoff packet | High | Medium | **Big bet: do now** |
| S2 Urgent out-of-hours rule | Medium | Low | Quick win |
| S5 Complaint / non-enquiry routing | Medium | Low | Quick win |
| S3 SMS confirmation | Medium | Low–medium | Next |
| S6 Packet into Found as task | High | Medium–high | Next (needs Found team) |
| S10 Self-serve config UI | Medium | Medium | Next |
| S11 Infer rota from call data | High | High | Later: validate A2 first |
| Voice cloning / premium TTS voices | Low–medium | Medium | **Not now** |

```
 Impact ↑
  High │ S1 S7 S8        │ S4 S9  S6 S11
       │ (quick wins)    │ (big bets)
  Med  │ S2 S5 S3        │ S10
       │                 │
  Low  │                 │ premium voices (not now)
       └─────────────────┴──────────────→ Effort
             Low               High
```

## RICE (illustrative)

Reach = share of conversations affected (assumed). Confidence reflects the assumptions page.

| Solution | Reach | Impact (0.25–3) | Confidence | Effort (sessions) | RICE |
| --- | --- | --- | --- | --- | --- |
| S1 Rota-checked promises | 40% | 2 | 60% | 1 | 48 |
| S9 Release gate | 100% (every release) | 2 | 70% | 2 | 70 |
| S7 Safeguarding path | 2% | 3 | 80% | 1 | 4.8 *(but a must-have regardless of RICE)* |
| S4 Handoff packet | 35% | 2 | 60% | 2 | 21 |
| S6 Packet into Found | 35% | 2 | 50% | 4 | 8.8 |
| S11 Infer rota | 100% of onboardings | 2 | 30% | 6 | 10 |

**Reading this:** RICE ranks the gate and rota-checked promises first. Safeguarding scores low on reach but is a hard requirement. RICE is not the right tool for safety floors, so they sit outside the ranking.

## Kano view
- **Must-be:** emergency and safeguarding handling, no false promises, disclosure rules.
- **Performance:** callback speed, packet completeness, latency.
- **Delighters:** "you won't need to repeat yourself", a sister-home suggestion when full.
