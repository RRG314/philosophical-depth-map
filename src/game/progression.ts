import { explorationAnswers, type State, type Question } from "../lib/model";
export const stations = [
  {
    name: "The shoreline",
    depth: "0.15 m",
    meters: 0.15,
    gear: "Wading · ankle deep",
    need: 0,
    theme: "Notice a claim",
    color: "#83d9d1",
  },
  {
    name: "The shallows",
    depth: "0.7 m",
    meters: 0.7,
    gear: "Wading · waist deep",
    need: 1,
    theme: "Give a reason",
    color: "#5ccbc4",
  },
  {
    name: "The tidal pool",
    depth: "1.4 m",
    meters: 1.4,
    gear: "Standing · neck deep",
    need: 3,
    theme: "Find an assumption",
    color: "#39b8ba",
  },
  {
    name: "The lagoon",
    depth: "Surface",
    meters: 3,
    gear: "Swimming · mask, snorkel & fins",
    need: 5,
    theme: "Consider another view",
    color: "#279eae",
  },
  {
    name: "The coral gardens",
    depth: "18 m",
    meters: 18,
    gear: "Scuba · cylinder, regulator & buoyancy vest",
    need: 8,
    theme: "Answer an objection",
    color: "#177b97",
  },
  {
    name: "The blue wall",
    depth: "60 m",
    meters: 60,
    gear: "Technical diving · redundant gas & lights",
    need: 12,
    theme: "Connect two ideas",
    color: "#185b79",
  },
  {
    name: "The twilight passage",
    depth: "600 m",
    meters: 600,
    gear: "Research submersible · pressure hull & lights",
    need: 18,
    theme: "Revisit what you think",
    color: "#163b59",
  },
  {
    name: "The abyssal plain",
    depth: "4,000 m",
    meters: 4000,
    gear: "Deep-rated submersible · robotic sampling arm",
    need: 24,
    theme: "Keep an inquiry open",
    color: "#162838",
  },
  {
    name: "The Mariana Trench",
    depth: "10,925 m",
    meters: 10919,
    gear: "Hadal exploration · submersible",
    need: 36,
    theme: "Return with a different question",
    color: "#101d2b",
  },
] as const;
export function expeditionProgress(state: State) {
  const answers = explorationAnswers(state);
  const count = new Set(answers.map((a) => a.questionId)).size;
  const unlocked = stations.filter((s) => count >= s.need).length - 1;
  return { answers, count, unlocked, next: stations[unlocked + 1] ?? null };
}
export type Mission = {
  question: Question;
  kind: "New inquiry" | "Saved inquiry" | "Revisit";
  instruction: string;
};
export function missions(
  state: State,
  questions: Question[],
  station: number,
  now = Date.now(),
): Mission[] {
  const pool = questions.filter((q) => !q.assessment);
  const answers = explorationAnswers(state);
  // Latest visit controls spacing. Repeating a question does not manufacture new milestones.
  const last = new Map<string, number>();
  for (const a of answers)
    last.set(
      a.questionId,
      Math.max(last.get(a.questionId) ?? 0, Date.parse(a.timestamp)),
    );
  const saved = pool.find((q) => state.saved.includes(q.id) && !last.has(q.id));
  const due = pool
    .filter((q) => last.has(q.id) && now - last.get(q.id)! >= 3 * 86400000)
    .sort((a, b) => last.get(a.id)! - last.get(b.id)!)[0];
  const fresh = pool.filter((q) => !last.has(q.id));
  // Rotate domains across stations; no philosophical school or scored answer is a gate.
  const offset = (station * 19) % Math.max(1, fresh.length);
  const ordered = [...fresh.slice(offset), ...fresh.slice(0, offset), ...pool];
  const candidates: Mission[] = [];
  if (due)
    candidates.push({
      question: due,
      kind: "Revisit",
      instruction:
        "Recall your earlier reason before opening the journal. Has an objection changed it, or can you defend it more clearly?",
    });
  if (saved)
    candidates.push({
      question: saved,
      kind: "Saved inquiry",
      instruction:
        "Take up the question you chose to keep open. State what you would need to settle it.",
    });
  for (const q of ordered) {
    if (candidates.length >= 3) break;
    if (!candidates.some((m) => m.question.id === q.id))
      candidates.push({
        question: q,
        kind: last.has(q.id) ? "Revisit" : "New inquiry",
        instruction: last.has(q.id)
          ? "Try the other objection. Retaining a position with reasons is as welcome as revising it."
          : "State a position, examine an objection, and record what you now think.",
      });
  }
  return candidates;
}
