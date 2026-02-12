export type QuestionTier = 'early' | 'mid' | 'senior';

export interface PortfolioQuestion {
  competencyArea: string;
  subCompetencyTitle: string;
  question: string;
}

// Competency area names centralized as constants
const COMPETENCY_AREAS = {
  PRODUCT_THINKING: "Product Thinking & Prioritization",
  VISUAL_INTERACTION: "Visual, Interaction & Content Design",
  COMMUNICATION: "Communication & Collaboration",
} as const;

export function getTierForRole(role: string): QuestionTier {
  const normalized = role.toLowerCase();
  if (normalized === 'associate' || normalized === 'intermediate') return 'early';
  if (normalized === 'senior') return 'mid';
  return 'senior'; // lead, principal
}

// --- Portfolio Questions ---

const EARLY_PORTFOLIO_QUESTIONS: PortfolioQuestion[] = [
  {
    competencyArea: COMPETENCY_AREAS.PRODUCT_THINKING,
    subCompetencyTitle: "Feature Definition & Prioritization",
    question: "Walk me through how you scoped and prioritized features in one of your portfolio projects. What tradeoffs did you make?",
  },
  {
    competencyArea: COMPETENCY_AREAS.PRODUCT_THINKING,
    subCompetencyTitle: "Analytical Thinking & Problem Solving",
    question: "Can you describe the problem you were solving in this project? How did you validate that your solution addressed the core issue?",
  },
  {
    competencyArea: COMPETENCY_AREAS.VISUAL_INTERACTION,
    subCompetencyTitle: "Interaction & Visual Design Execution",
    question: "Walk me through your design decisions for the visual and interaction patterns in this project. How did you ensure consistency?",
  },
  {
    competencyArea: COMPETENCY_AREAS.VISUAL_INTERACTION,
    subCompetencyTitle: "Information Architecture & Content Design",
    question: "How did you structure the information and content in this experience? What principles guided your decisions?",
  },
  {
    competencyArea: COMPETENCY_AREAS.VISUAL_INTERACTION,
    subCompetencyTitle: "Accessibility & Inclusive Design",
    question: "What accessibility considerations did you incorporate into this design? How did you validate it works for diverse users?",
  },
  {
    competencyArea: COMPETENCY_AREAS.COMMUNICATION,
    subCompetencyTitle: "Agile Practices & Cross-Functional Collaboration",
    question: "How did you work with engineering and product teams on this project? What was your collaboration process?",
  },
  {
    competencyArea: COMPETENCY_AREAS.COMMUNICATION,
    subCompetencyTitle: "Workshop Facilitation & Design Critique",
    question: "How did you gather and incorporate feedback during this project? Did you facilitate any sessions with stakeholders?",
  },
  {
    competencyArea: COMPETENCY_AREAS.COMMUNICATION,
    subCompetencyTitle: "Emotional Intelligence & Feedback",
    question: "Tell me about a challenging conversation or difficult feedback you received on this project. How did you respond?",
  },
];

const MID_PORTFOLIO_QUESTIONS: PortfolioQuestion[] = [
  {
    competencyArea: COMPETENCY_AREAS.PRODUCT_THINKING,
    subCompetencyTitle: "Analytical Thinking & Problem Solving",
    question: "Walk me through the most complex design problem in your portfolio. How did you break it down and what frameworks did you use?",
  },
  {
    competencyArea: COMPETENCY_AREAS.VISUAL_INTERACTION,
    subCompetencyTitle: "Interaction & Visual Design Execution",
    question: "Show me a project where you established or extended a design system. How did you ensure scalability and adoption?",
  },
  {
    competencyArea: COMPETENCY_AREAS.COMMUNICATION,
    subCompetencyTitle: "Mentorship & Team Growth",
    question: "Can you share an example where you mentored a junior designer or elevated the quality of work around you?",
  },
];

const SENIOR_PORTFOLIO_QUESTIONS: PortfolioQuestion[] = [
  {
    competencyArea: COMPETENCY_AREAS.PRODUCT_THINKING,
    subCompetencyTitle: "Feature Definition & Prioritization",
    question: "Describe a project where you influenced the product strategy or roadmap through design. What was your approach to gaining executive buy-in?",
  },
  {
    competencyArea: COMPETENCY_AREAS.COMMUNICATION,
    subCompetencyTitle: "Cross-Functional Leadership",
    question: "Tell me about a time you drove alignment across multiple teams or departments on a design initiative. What was your strategy?",
  },
  {
    competencyArea: COMPETENCY_AREAS.VISUAL_INTERACTION,
    subCompetencyTitle: "Design Operations & Standards",
    question: "How have you shaped design processes, standards, or tooling at an organizational level? What impact did it have?",
  },
];

const PORTFOLIO_QUESTIONS_BY_TIER: Record<QuestionTier, PortfolioQuestion[]> = {
  early: EARLY_PORTFOLIO_QUESTIONS,
  mid: [...EARLY_PORTFOLIO_QUESTIONS, ...MID_PORTFOLIO_QUESTIONS],
  senior: [...EARLY_PORTFOLIO_QUESTIONS, ...MID_PORTFOLIO_QUESTIONS, ...SENIOR_PORTFOLIO_QUESTIONS],
};

export function getPortfolioQuestionsForRole(role: string): PortfolioQuestion[] {
  return PORTFOLIO_QUESTIONS_BY_TIER[getTierForRole(role)];
}

// --- Interview Questions ---

const EARLY_INTERVIEW_QUESTIONS: string[] = [
  "Can you summarize your background and experience and what makes you excited for the opportunity?",
  "What were your first impressions after the interview with the recruiter?",
  "When you think about the favorite team you've been apart of, what did you like most?",
  "What did you dislike?",
  "What would your favorite manager say is your biggest strength?",
  "How do you balance quick execution with design quality?",
  "Can you share an example of a time when engineering feedback changed your design direction?",
  "What strategies do you use to quickly re-enter context after switching tasks?",
  "Describe a situation where you helped align different perspectives across product, design, and engineering.",
  "Tell me about a time you had to present a design direction that wasn't initially well understood. How did you build alignment?",
  "How do you balance quantitative data with qualitative insights?",
  "Have you designed experiences that include AI or automation? What challenges did you face?",
];

const MID_INTERVIEW_QUESTIONS: string[] = [
  "Describe a situation where you had to manage competing priorities across multiple projects. How did you decide what to focus on?",
  "Tell me about a time you identified a systemic design problem and drove a solution without being asked.",
  "How have you helped less experienced designers grow? Give a specific example.",
];

const SENIOR_INTERVIEW_QUESTIONS: string[] = [
  "How have you influenced product or design strategy beyond your immediate team?",
  "Describe a time you had to make a high-stakes design decision with incomplete information. How did you manage risk?",
  "How do you build and maintain a culture of design excellence across an organization?",
];

const INTERVIEW_QUESTIONS_BY_TIER: Record<QuestionTier, string[]> = {
  early: EARLY_INTERVIEW_QUESTIONS,
  mid: [...EARLY_INTERVIEW_QUESTIONS, ...MID_INTERVIEW_QUESTIONS],
  senior: [...EARLY_INTERVIEW_QUESTIONS, ...MID_INTERVIEW_QUESTIONS, ...SENIOR_INTERVIEW_QUESTIONS],
};

export function getInterviewQuestionsForRole(role: string): string[] {
  return INTERVIEW_QUESTIONS_BY_TIER[getTierForRole(role)];
}
