import prd from "../docs/PRD.md";
import fiveWhys from "../docs/FIVE_WHYS.md";
import users from "../docs/USERS_JTBD_STORIES.md";
import assumptions from "../docs/ASSUMPTIONS_OPEN_QUESTIONS.md";
import prioritisation from "../docs/OPPORTUNITY_PRIORITISATION.md";
import metrics from "../docs/METRICS_AND_EVALS.md";
import risks from "../docs/RISKS_PREMORTEM_KILL_CRITERIA.md";
import roadmap from "../docs/ROADMAP.md";
import demo from "../docs/DEMO_SCRIPT.md";

export interface Doc {
  slug: string;
  title: string;
  markdown: string;
}

export const DOCS: Doc[] = [
  { slug: "prd", title: "PRD", markdown: prd },
  { slug: "five-whys", title: "5 Whys root cause", markdown: fiveWhys },
  { slug: "users-jtbd", title: "Users, JTBD & stories", markdown: users },
  { slug: "assumptions", title: "Assumptions & open questions", markdown: assumptions },
  { slug: "prioritisation", title: "Opportunity & impact vs effort", markdown: prioritisation },
  { slug: "metrics", title: "Metrics & evals", markdown: metrics },
  { slug: "risks", title: "Risks, pre-mortem & kill criteria", markdown: risks },
  { slug: "roadmap", title: "Roadmap & bets not taken", markdown: roadmap },
  { slug: "demo", title: "5-minute demo script", markdown: demo },
];
