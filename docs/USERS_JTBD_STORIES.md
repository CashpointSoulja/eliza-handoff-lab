# Users, jobs-to-be-done and user stories

## Target users

### 1. The family (care seeker)
- **Who:** typically an adult child or spouse arranging care for someone else. They are often calling after work, often after a hospital or GP conversation, and often more than one provider at once.
- **State of mind:** worried, short on time, sometimes in crisis. Many don't know the vocabulary (residential or nursing, self-funding or local authority).
- **What "good" feels like:** *"Someone listened, told me the truth, and I know exactly who is calling me back and when."*

### 2. The care provider
- **Admissions / home manager:** owns occupancy and conversion. They want qualified leads with context, and no surprises.
- **On-call manager:** covers evenings and weekends. They want to be woken only for urgent or safeguarding issues.
- **Clinical lead:** owns clinical assessments. They need to hear about clinical questions and don't want the AI promising care the home can't provide.
- **What "good" feels like:** *"Eliza only sends me what needs me, and never says something I have to walk back."*

### 3. Internal: the Eliza PM, engineering and account management
- **PM / eng:** want to ship prompt and model changes weekly with confidence.
- **Account management / onboarding:** want to set up a new group's phone tree and escalation rules in hours.
- **What "good" feels like:** *"I can see why Eliza routed a call, and the gate tells me before a provider does."*

## Jobs-to-be-done

| User | When… | I want to… | So I can… |
| --- | --- | --- | --- |
| Family | I'm calling a home at 7pm about a discharge on Friday | get a real answer and a time-bound next step | stop worrying that nobody will ring back |
| Family | I'm describing something frightening about my mum's current care | be taken seriously and reach a person now | know it's being dealt with tonight |
| Family | I ask to speak to a person | be put through, or be told honestly when someone will call | not feel trapped with a robot |
| Admissions | I start my shift | see a prioritised queue of enquiries with context | call the urgent ones first without re-asking basics |
| On-call manager | it's 10pm | be alerted only for urgent or safeguarding issues | protect my evening and still catch what matters |
| Home manager | a resident's family complains | get it directly, not via sales | fix it before it becomes a review or a CQC concern |
| Clinical lead | a family asks about PEG feeding | be the one who answers | avoid promising care the home can't provide |
| Eliza PM | I'm about to ship a faster model | see exactly which labelled conversations change | ship or block with evidence, not instinct |
| Onboarding | a new 12-home group signs | turn their rota and rules into config | go live in hours, not weeks |

## User stories and acceptance criteria

**US1: Out-of-hours urgent enquiry** (S01, S13)
As a family member calling out of hours about an urgent situation, I want a callback from a real person soon, so I'm not left waiting until Monday.
- *Given* the provider rule is "urgent out of hours → on-call" *and* on-call is on rota, *then* Eliza promises a callback within the configured minutes, names the role, and writes a P1 packet.
- *Given* the rule is "next business morning", *then* the promise is first thing on the next admissions shift, with that time stated.

**US2: Safeguarding disclosure** (S04, S05)
As a family member describing possible harm, I want it escalated now.
- Indirect wording ("frightened of the carer", "bruises") counts.
- Eliza stops qualifying, gives the 999 line, and sends a P0 to the safeguarding lead, or to on-call if the lead is off rota.

**US3: Honest human request** (S07, S08)
As a caller who asks for a person, I want to be transferred if someone is there, and told the truth if not.
- There is never a transfer to a role with nobody on rota.
- An out-of-hours callback states a day and time taken from the rota.

**US4: Disclosure rules** (S10, S15, S01)
As a provider, I want Eliza to say only what I allow about fees and rooms.
- "From £X" policy: the internal weekly rate is never said.
- If the primary home is full for that care type, Eliza offers a sister home that has space and never says "yes, we have rooms".

**US5: Clinical questions** (S09)
As a clinical lead, I want capability questions routed to me.
- Eliza never confirms clinical capability. She transfers live if the lead is on shift, otherwise books a callback with the lead.

**US6: Complaints** (S06)
As a home manager, I want existing-resident complaints routed to me.
- The complaint doesn't enter the enquiry pipeline. It goes to the home manager (live if in, callback if not).

**US7: Release gate**
As the Eliza PM, I want every candidate change evaluated against the labelled set.
- The gate blocks on any safety-critical miss, trust violation, false containment, or regression beyond tolerance, and lists the case-level regressions.

**US8: Onboarding config**
As an onboarding specialist, I want to edit rota and rules without code and immediately see how routing changes.

## Main use cases in the lab
1. Run the 7pm discharge call (S01) with v1, then v2, and compare what the family was told and what the provider receives.
2. Change the provider rule "urgent out of hours" to "next business morning" and re-run S01 to watch the promise change.
3. Evaluate v3 against v2 and watch the gate block on S04.
4. Type your own conversation (for example "My mum keeps falling and I'm scared she'll be hurt") at a chosen time and channel.
5. Review a case and record a disagreement for the labelled set.
