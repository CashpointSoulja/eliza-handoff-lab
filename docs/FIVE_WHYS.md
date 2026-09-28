# 5 Whys: why do care enquiries still get lost?

> These are hypotheses to test, not findings. They start from the one figure in the posting ("a third of enquiries to care providers go unanswered") and follow how an enquiry could still be lost after an AI answers the phone. I have not seen Eliza's data.

**Problem:** A family contacts a care provider out of hours and does not become a visit or an admission, even though someone answered.

| Why? | Answer (hypothesis) | How we'd check |
| --- | --- | --- |
| 1. Why didn't the enquiry convert? | The family got no clear, trusted next step. The call ended with "someone will be in touch" and nobody was, or not in time. | Transcript review: share of calls that end without a named person and a time. |
| 2. Why was there no clear next step? | The AI didn't know who was actually available. It promised a transfer or "within the hour" callback against a rota it couldn't see. | Compare promised callback times with when the callback actually happened (from call tracking). |
| 3. Why didn't it know who was available? | Each provider's rota, out-of-hours cover and rules live in people's heads, PDFs and phone trees. They are not in a structured config the AI can read. | Onboarding interviews: how many providers have a written escalation tree? How often does it change? |
| 4. Why isn't it structured? | Onboarding focuses on getting the number live (provisioning, routing), not on writing down handoff rules. Every group is different, so it has been done by hand. | Time-to-live vs. time-to-configure handoff rules for recent onboardings. |
| 5. Why is onboarding set up that way? | **Root cause:** there is no shared, testable definition of a good handoff per provider. Without one, nothing forces the rules to be written down, nothing checks the AI against them, and model or prompt changes can't be regression-tested against them. | This lab is the smallest possible version of that definition: config, then policy, then eval gate. |

## What the root cause implies

- The fix is not "a better model". It is **a handoff contract per provider**: rota, disclosure rules and escalation owners, which both the AI and the eval suite read.
- That contract also makes onboarding faster ("configure in hours, not weeks", from the posting). It is one artefact for two problems.
- It gives a clear answer to *"when is a faster model worth a slightly worse answer?"*: when it passes the same gate.

## Contributing causes (not root, still worth fixing)

- Chat enquiries have no caller number, so when Eliza answers the question without collecting a contact, the lead is lost. The lab shows this as an enquiry-capture gap even for v2.
- Families rarely use the word "abuse". A safeguarding check that only looks for keywords misses real disclosures (the S04 case).
- Complaints from existing residents' families come in on sales numbers and pollute the enquiry pipeline.
