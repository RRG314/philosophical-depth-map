import type { Action, Problem, Trace } from "../core/schema";
export function StructuredEditor({
  problem,
  action,
  onChange,
}: {
  problem: Problem;
  action: Action;
  onChange: (a: Action) => void;
}) {
  return (
    <div className="lab-structured">
      <details>
        <summary>Structured commitments and definitions</summary>
        <p>
          The deterministic engine reads these fields. Your prose is preserved
          for a reader; it is not parsed by the rules.
        </p>
        {problem.propositions.map((p) => (
          <label key={p.id}>
            <b>
              {p.id} · {p.kind}
            </b>{" "}
            — {p.text}
            <select
              aria-label={`Commitment ${p.id}`}
              value={action.commitments[p.id] || "suspend"}
              onChange={(e) =>
                onChange({
                  ...action,
                  commitments: {
                    ...action.commitments,
                    [p.id]: e.target.value as "accept" | "reject" | "suspend",
                  },
                })
              }
            >
              <option value="suspend">Suspend / not committed</option>
              <option value="accept">Accept for this argument</option>
              <option value="reject">Reject</option>
            </select>
          </label>
        ))}
        {problem.terms.map((t) => (
          <label key={t}>
            Definition: {t}
            <input
              value={action.definitions[t] || ""}
              maxLength={500}
              onChange={(e) =>
                onChange({
                  ...action,
                  definitions: { ...action.definitions, [t]: e.target.value },
                })
              }
            />
          </label>
        ))}
        {problem.objections.map((o) => (
          <label className="check" key={o.id}>
            <input
              type="checkbox"
              checked={action.admittedObjections.includes(o.id)}
              onChange={(e) =>
                onChange({
                  ...action,
                  admittedObjections: e.target.checked
                    ? [...action.admittedObjections, o.id]
                    : action.admittedObjections.filter((id) => id !== o.id),
                })
              }
            />
            I admit this challenge applies: {o.text}
          </label>
        ))}
        {problem.hypotheses.map((h) => (
          <label key={h.id}>
            {h.id} — {h.consequence}
            <select
              aria-label={`Outcome ${h.id}`}
              value={action.outcomes[h.id] || "unmeasured"}
              onChange={(e) =>
                onChange({
                  ...action,
                  outcomes: {
                    ...action.outcomes,
                    [h.id]: e.target.value as
                      "confirmed" | "disconfirmed" | "unmeasured",
                  },
                })
              }
            >
              <option value="unmeasured">Unmeasured / unresolved</option>
              <option value="confirmed">
                Observed support in this scenario
              </option>
              <option value="disconfirmed">
                Observed contrary result in this scenario
              </option>
            </select>
            <small>
              Evidence required: {h.evidenceNeeded} Selecting an outcome records
              your stipulation, not an actual experiment.
            </small>
          </label>
        ))}
        <label>
          Reason for a revision or retention
          <input
            maxLength={1000}
            value={action.revisionNote}
            onChange={(e) =>
              onChange({ ...action, revisionNote: e.target.value })
            }
          />
        </label>
      </details>
    </div>
  );
}
export function ArgumentPanel({
  problem,
  trace,
}: {
  problem: Problem;
  trace?: Trace;
}) {
  return (
    <section className="lab-graph" aria-label="Structured argument">
      <h2>Argument structure</h2>
      <p>
        Proposed reconstruction, open to objection. Arrows encode declared
        dependencies; they do not prove that a premise is true.
      </p>
      <svg
        className="argument-diagram"
        viewBox={`0 0 620 ${Math.max(180, problem.propositions.length * 60)}`}
        role="img"
        aria-label="Directed dependency graph; full propositions and edge descriptions follow"
      >
        <defs>
          <marker
            id="lab-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8Z" fill="currentColor" />
          </marker>
        </defs>
        {problem.arguments.flatMap((a) =>
          a.premises.map((id) => {
            const from = problem.propositions.findIndex((p) => p.id === id),
              to = problem.propositions.findIndex((p) => p.id === a.conclusion);
            return (
              <path
                key={a.id + id}
                d={`M 130 ${from * 60 + 30} C 350 ${from * 60 + 30}, 350 ${to * 60 + 30}, 470 ${to * 60 + 30}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={a.kind === "defeasible" ? "6 4" : undefined}
                markerEnd="url(#lab-arrow)"
              />
            );
          }),
        )}
        {problem.propositions.map((p, i) => (
          <g key={p.id}>
            <rect
              x="10"
              y={i * 60 + 10}
              width="120"
              height="40"
              rx="8"
              fill="#e3efea"
              stroke="currentColor"
            />
            <text
              x="70"
              y={i * 60 + 35}
              textAnchor="middle"
              fill="currentColor"
            >
              {p.id} · {p.kind}
            </text>
            <rect
              x="475"
              y={i * 60 + 10}
              width="130"
              height="40"
              rx="8"
              fill="#f7f5ef"
              stroke="currentColor"
            />
            <text
              x="540"
              y={i * 60 + 35}
              textAnchor="middle"
              fill="currentColor"
            >
              {p.id}
            </text>
          </g>
        ))}
      </svg>
      <p className="small">
        Read edges from left to right. Dashed edges are defeasible; solid edges
        are strict within the encoding. Repeated IDs denote the same
        proposition.
      </p>
      <div className="lab-node-grid">
        {problem.propositions.map((p) => (
          <article key={p.id}>
            <span className="eyebrow">
              {p.id} · {p.kind}
            </span>
            <p>{p.text}</p>
            {trace && (
              <strong>{trace.facts.find((x) => x.id === p.id)?.status}</strong>
            )}
          </article>
        ))}
      </div>
      {problem.arguments.map((a) => (
        <p key={a.id}>
          <b>{a.id}:</b> {a.premises.join(" + ")} → {a.conclusion} ({a.kind}).{" "}
          {a.warrant}
        </p>
      ))}
      {trace && (
        <details>
          <summary>Inspect the full structured trace</summary>
          <pre>{JSON.stringify(trace, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
