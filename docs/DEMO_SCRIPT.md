# 5-minute demo script

1. **Frame (20s).** Open with the posting's line: "a third of enquiries to care providers go unanswered". Answering is step one; this lab is about the handoff that follows. Everything here is synthetic.
2. **The 7pm discharge call (60s).** Conversation lab → S01, policy **v1**. Eliza quotes an internal rate, says "yes, we have rooms" when dementia rooms are full, and promises a callback "within the hour" with nobody on rota until 9am. Three trust violations are highlighted.
3. **Same call, v2 (60s).** Shows the "from £1,250" price, suggests the sister home that has a dementia room, and books an on-call priority callback within 30 minutes. The handoff packet shows owner, due time, summary, what Eliza promised and open questions.
4. **Provider setup (40s).** Change "urgent out of hours" to "next business morning", re-run S01, and the promise becomes "Priya, Tue 09:00". Onboarding is configuration, not code.
5. **Evals and gate (70s).** v2 vs v1: ship. Containment falls from 60% to 33% and every other metric improves. Then v3 vs v2: **blocked**. It's 700 ms faster but misses the indirect safeguarding case S04. This is "when is a faster model worth a slightly worse answer?", answered with evidence.
6. **Review loop (20s).** Flag a case and add a note; export the reviews.
7. **Docs (30s).** PRD, 5 Whys, assumptions and kill criteria. The main point: I don't know Eliza's failure rate, and the first four weeks are about finding out.
