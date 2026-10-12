import { z } from "zod";
export const domains = [
  "ethics",
  "epistemology",
  "logic",
  "metaphysics",
  "mind",
  "politics",
  "aesthetics",
  "science",
] as const;
export type Domain = (typeof domains)[number];
export const skills = [
  "justification",
  "assumptions",
  "counterargument",
  "consistency",
  "precision",
  "integration",
] as const;
export type Skill = (typeof skills)[number];
export const labels: Record<Domain, string> = {
  ethics: "Ethics",
  epistemology: "Knowledge",
  logic: "Logic & arguments",
  metaphysics: "Reality",
  mind: "Mind",
  politics: "Society & power",
  aesthetics: "Art & beauty",
  science: "Science",
};
export type Question = {
  id: string;
  version: string;
  domain: Domain;
  title: string;
  prompt: string;
  concepts: string[];
  references: string[];
  responseType:
    "choice" | "short" | "reconstruction" | "dilemma" | "reflection";
  options?: string[];
  correctIndex?: number;
  explanation: string;
  difficultyHypothesis: string;
  skills: Skill[];
  followup: string;
  branches: { label: string; prompt: string; concept: string }[];
  rubricId: string;
  editorialStatus: string;
  calibrationStatus: string;
  sampleAnchors: { score: number; answer: string; rationale: string }[];
  assessment: boolean;
};
export type Concept = {
  id: string;
  label: string;
  domain: Domain;
  description: string;
  reference: string;
};
export type Edge = {
  id: string;
  from: string;
  to: string;
  type: string;
  contested: boolean;
  note: string;
};
const score = z.number().int().min(0).max(4).nullable();
export const ratingSchema = z
  .object({
    dimension: z.enum(skills),
    score,
    max: z.literal(4),
    evidence: z.string().max(6000),
    reason: z.string().max(2000),
    rater: z.literal("self"),
    rubricVersion: z.literal("reasoning-1.0"),
    timestamp: z.string().datetime(),
  })
  .strict();
export const responseSchema = z
  .object({
    id: z.string().uuid(),
    questionId: z.string().max(60),
    itemVersion: z.string().max(30),
    mode: z.enum(["explore", "assessment"]),
    sessionId: z.string().uuid(),
    position: z.string().max(6000),
    explanation: z.string().max(6000),
    reply: z.string().max(6000),
    choice: z.number().int().min(0).max(20).nullable(),
    revised: z.boolean(),
    assumptionNoted: z.boolean(),
    uncertain: z.boolean(),
    branch: z.number().int().min(0).max(10),
    ratings: z.array(ratingSchema).max(6),
    timestamp: z.string().datetime(),
  })
  .strict();
export type Answer = z.infer<typeof responseSchema>;
const activeSchema = z
  .object({
    mode: z.enum(["explore", "assessment"]),
    questionId: z.string(),
    index: z.number().int().min(0).max(15),
    stage: z.number().int().min(0).max(2),
    sessionId: z.string().uuid(),
    position: z.string().max(6000),
    explanation: z.string().max(6000),
    reply: z.string().max(6000),
    choice: z.number().int().min(0).max(20).nullable(),
    revised: z.boolean(),
    assumptionNoted: z.boolean(),
    uncertain: z.boolean(),
    branch: z.number().int().min(0).max(10),
    ratings: z.array(ratingSchema).max(6),
    ratingDraft: z
      .partialRecord(
        z.enum(skills),
        z
          .object({
            score: z.string().regex(/^[0-4]?$/),
            evidence: z.string().max(6000),
            reason: z.string().max(2000),
          })
          .strict(),
      )
      .default({}),
  })
  .strict();
export type Active = z.infer<typeof activeSchema>;
export const stateSchema = z
  .object({
    version: z.literal(1),
    profile: z.string().max(40),
    answers: z.array(responseSchema).max(2000),
    saved: z.array(z.string().max(60)).max(200),
    discovered: z.array(z.string().max(80)).max(1000),
    active: activeSchema.nullable(),
    settings: z
      .object({
        motion: z.boolean(),
        sound: z.boolean(),
        diver: z.enum(["expanded", "minimized", "dismissed"]),
        aiConsent: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (new Set(s.answers.map((a) => a.id)).size !== s.answers.length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate response identifiers",
      });
    for (const a of s.answers) {
      if (new Set(a.ratings.map((r) => r.dimension)).size !== a.ratings.length)
        ctx.addIssue({ code: "custom", message: "Duplicate dimensions" });
      for (const r of a.ratings)
        if (
          r.score !== null &&
          (!r.evidence ||
            ![a.position, a.explanation, a.reply].some((t) =>
              t.includes(r.evidence),
            ))
        )
          ctx.addIssue({
            code: "custom",
            message: "Rating evidence must quote the response",
          });
    }
  });
export type State = z.infer<typeof stateSchema>;
export const emptyState = (): State => ({
  version: 1,
  profile: "Explorer",
  answers: [],
  saved: [],
  discovered: [],
  active: null,
  settings: {
    motion: !matchMediaSafe(),
    sound: false,
    diver: "expanded",
    aiConsent: false,
  },
});
function matchMediaSafe() {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
export function parseImport(
  text: string,
  questions: Question[],
  concepts: Concept[],
): State {
  if (text.length > 2_000_000) throw Error("File exceeds 2 MB.");
  const s = stateSchema.parse(JSON.parse(text));
  const ids = new Set(questions.map((q) => q.id));
  if (
    s.saved.some((id) => !ids.has(id)) ||
    s.answers.some((a) => !ids.has(a.questionId)) ||
    s.discovered.some((id) => !concepts.some((c) => c.id === id))
  )
    throw Error("Unknown content identifiers.");
  for (const a of s.answers) {
    const q = questions.find((q) => q.id === a.questionId)!;
    if (
      a.itemVersion !== q.version ||
      a.ratings.some((r) => !q.skills.includes(r.dimension)) ||
      (a.choice !== null && (!q.options || a.choice >= q.options.length))
    )
      throw Error("Content version or rating opportunity mismatch.");
  }
  if (s.active) {
    const q = questions.find((q) => q.id === s.active!.questionId);
    if (
      !q ||
      s.active.branch >= q.branches.length ||
      (s.active.choice !== null &&
        (!q.options || s.active.choice >= q.options.length)) ||
      (s.active.mode === "assessment" &&
        questions
          .filter((x) => x.assessment)
          .sort((a, b) => a.id.localeCompare(b.id))[s.active.index]?.id !==
          q.id)
    )
      throw Error("Invalid active question.");
    s.active.ratings = [];
  }
  s.saved = [...new Set(s.saved)];
  s.discovered = [...new Set(s.discovered)];
  s.settings.aiConsent = false;
  return s;
}
export function begin(
  q: Question,
  mode: Active["mode"] = "explore",
  index = 0,
  sessionId: string = crypto.randomUUID(),
): Active {
  return {
    questionId: q.id,
    mode,
    index,
    stage: 0,
    sessionId,
    position: "",
    explanation: "",
    reply: "",
    choice: null,
    revised: false,
    assumptionNoted: false,
    uncertain: false,
    branch: 0,
    ratings: [],
    ratingDraft: {},
  };
}
export const rubric: Record<Skill, string[]> = {
  justification: [
    "A position with no supporting reason",
    "A reason is offered but its relevance is unclear",
    "A relevant reason supports the position",
    "The reason is developed and its limits recognised",
    "A connected justification weighs alternatives and explains its limits",
  ],
  assumptions: [
    "A relevant assumption is missed when explicitly invited",
    "An assumption is named vaguely",
    "A relevant unstated premise is identified",
    "Its role and possible failure are explained",
    "Its effect is tested against a plausible alternative",
  ],
  counterargument: [
    "An invited objection is ignored or distorted",
    "An objection is mentioned without engagement",
    "A relevant objection is represented fairly",
    "The response answers its strongest relevant point",
    "The objection changes or strengthens a qualified argument with clear reasons",
  ],
  consistency: [
    "An explicit relevant contradiction is left unresolved",
    "A tension is noticed without addressing it",
    "Relevant claims fit together in this response",
    "A tension is resolved with a stated distinction",
    "The resolution is checked against further implications",
  ],
  precision: [
    "A central ambiguity prevents understanding",
    "A central term is used without needed clarification",
    "A relevant term or distinction is explained",
    "A distinction resolves a concrete ambiguity",
    "The distinction survives a challenging boundary case",
  ],
  integration: [
    "An invited comparison or reflection is absent",
    "Earlier reasoning is mentioned but not connected",
    "A relevant connection between claims is explained",
    "A connection informs a defended revision or qualified retention",
    "Implications and limits of the integrated position are examined",
  ],
};
export function summary(answers: Answer[], dimension: Skill) {
  const eligible = answers.flatMap((a) =>
    a.ratings.filter((r) => r.dimension === dimension),
  );
  const observed = eligible.filter((r) => r.score !== null);
  const denominator = observed.reduce((n, r) => n + r.max, 0);
  const total = observed.reduce((n, r) => n + r.score!, 0);
  return {
    n: observed.length,
    na: eligible.length - observed.length,
    total,
    denominator,
    mean: observed.length ? total / observed.length : null,
    range: observed.length
      ? [
          Math.min(...observed.map((r) => r.score!)),
          Math.max(...observed.map((r) => r.score!)),
        ]
      : null,
  };
}
export function knowledge(answers: Answer[], questions: Question[]) {
  const a = answers.filter(
    (a) =>
      questions.find((q) => q.id === a.questionId)?.correctIndex !==
        undefined && a.choice !== null,
  );
  return {
    n: a.length,
    correct: a.filter(
      (a) =>
        questions.find((q) => q.id === a.questionId)?.correctIndex === a.choice,
    ).length,
  };
}
export const regions = [
  "The shoreline",
  "The shallows",
  "The tidal pool",
  "The lagoon",
  "The coral gardens",
  "The blue wall",
  "The twilight passage",
  "The abyssal plain",
  "The Mariana Trench",
];
export const regionThresholds = [0, 1, 3, 5, 8, 12, 18, 24, 36];
export function explorationAnswers(s: State) {
  return s.answers.filter(
    (a) =>
      a.mode === "explore" &&
      Boolean(
        a.position.trim() ||
        a.explanation.trim() ||
        a.reply.trim() ||
        a.choice !== null,
      ),
  );
}
export function xp(s: State) {
  // Engagement only: neither agreement, revision, self-ratings nor assessment results earn a bonus.
  return new Set(explorationAnswers(s).map((a) => a.questionId)).size * 10;
}
export function region(s: State) {
  return regions[regionThresholds.filter((n) => xp(s) / 10 >= n).length - 1];
}
export const badges = [
  ["First Question", "Complete one exploration round."],
  ["Devil’s Advocate", "Respond to an objection."],
  ["Hidden Assumption", "Mark an assumption you examined."],
  ["Two Sides", "Try both branches of one question."],
  ["Into the Deep", "Explore eight different questions."],
  ["Reconsidered", "Record a revision or qualification."],
  ["Bridge Builder", "Explore three domains."],
  ["Unanswered Questions", "Save a question to revisit."],
  ["Long Conversation", "Complete ten rounds, including revisits."],
  ["Cartographer", "Discover twelve concepts."],
];
export function achievements(s: State, qs: Question[]) {
  const a = explorationAnswers(s);
  return [
    a.length > 0,
    a.some((x) => x.reply.trim()),
    a.some((x) => x.assumptionNoted),
    a.some((x) =>
      a.some((y) => x.questionId === y.questionId && x.branch !== y.branch),
    ),
    new Set(a.map((x) => x.questionId)).size >= 8,
    a.some((x) => x.revised),
    new Set(a.map((x) => qs.find((q) => q.id === x.questionId)?.domain)).size >=
      3,
    s.saved.length > 0,
    a.length >= 10,
    s.discovered.length >= 12,
  ];
}
export function recommendations(s: State, qs: Question[], q?: Question) {
  const latest = s.answers.at(-1);
  const selectedConcept = q?.branches[latest?.branch ?? 0]?.concept;
  const unresolved = new Set(
    s.answers
      .filter((a) => a.uncertain)
      .flatMap(
        (a) => qs.find((item) => item.id === a.questionId)?.concepts ?? [],
      ),
  );
  const unobserved = new Set(
    skills.filter((skill) => summary(s.answers, skill).n === 0),
  );
  return qs
    .filter((item) => !item.assessment)
    .sort((a, b) => {
      const rank = (x: Question) =>
        Number(!s.answers.some((a) => a.questionId === x.id)) * 4 +
        Number(q?.domain === x.domain) +
        Number(q?.concepts.some((c) => x.concepts.includes(c))) * 2 +
        Number(s.saved.includes(x.id)) +
        Number(
          Boolean(selectedConcept && x.concepts.includes(selectedConcept)),
        ) *
          3 +
        Number(x.concepts.some((c) => unresolved.has(c))) * 2 +
        Number(x.skills.some((skill) => unobserved.has(skill)));
      return rank(b) - rank(a) || a.id.localeCompare(b.id);
    })
    .filter((x) => x.id !== q?.id)
    .slice(0, 3);
}
export function neighbours(id: string, edges: Edge[]) {
  return edges
    .filter((e) => e.from === id || e.to === id)
    .map((e) => (e.from === id ? e.to : e.from));
}
