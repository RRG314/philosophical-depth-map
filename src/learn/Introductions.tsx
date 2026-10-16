const introductions = [
  {
    title: "Reasons and arguments",
    question: "What supports the conclusion?",
    idea: "An argument connects a claim to reasons for accepting it. Identifying those reasons helps you decide where you agree, where you disagree, and what is missing.",
    example:
      "‘The rule treats everyone alike, so it is fair.’ The conclusion is that the rule is fair. The reason is equal treatment. A further assumption is that equal treatment is enough for fairness—even when people's circumstances differ.",
    practice:
      "Write the conclusion in one sentence. List its reasons. Ask whether those reasons could be true while the conclusion is false.",
    url: "https://plato.stanford.edu/entries/critical-thinking/",
    source: "Read about critical thinking",
  },
  {
    title: "Knowledge and doubt",
    question: "What would justify this belief?",
    idea: "We can distinguish believing something, having reasons for it, and knowing it. Philosophers disagree about exactly what knowledge requires. Doubt can help identify a weak reason without showing that a belief is false.",
    example:
      "A clock says noon. You believe it is noon, but then learn that the clock stopped yesterday. Your reason has failed, even if it happens to be noon now.",
    practice:
      "Name a belief and its source. What could undermine that source? What additional evidence would matter?",
    url: "https://plato.stanford.edu/entries/epistemology/",
    source: "Read about epistemology",
  },
  {
    title: "Ethics and responsibility",
    question: "What makes an action justified?",
    idea: "Ethical questions ask what we should do and what we owe others. Consequences, duties, character, and relationships can matter in different ways. Naming a principle is only a beginning; we also need to explain why it applies.",
    example:
      "A promise conflicts with helping someone in urgent need. Keeping the promise and preventing harm both provide reasons. Which matters here, and would your answer change in a less urgent case?",
    practice:
      "Describe who is affected, which reasons conflict, and what would make you reconsider. Try to state the strongest objection to your own answer.",
    url: "https://plato.stanford.edu/entries/ethics-deontological/",
    source: "Explore duties and their alternatives",
  },
];
export default function Introductions() {
  return (
    <section
      className="learning-introductions"
      aria-labelledby="starting-points"
    >
      <h2 id="starting-points">A few starting points</h2>
      <p>
        You do not need specialist vocabulary to begin. These short
        introductions give you something to try before the longer readings.
      </p>
      {introductions.map((i) => (
        <details key={i.title}>
          <summary>
            {i.title} <span>— {i.question}</span>
          </summary>
          <p>{i.idea}</p>
          <h3>An example</h3>
          <p>{i.example}</p>
          <h3>Try it</h3>
          <p>{i.practice}</p>
          <a href={i.url} target="_blank" rel="noreferrer">
            {i.source} — Stanford Encyclopedia of Philosophy ↗
          </a>
        </details>
      ))}
      <div className="journey-links">
        <a href="#experiments">Try a thought experiment →</a>
        <a href="#explore">Practice with a question →</a>
        <a href="#library">Look up a concept →</a>
      </div>
    </section>
  );
}
