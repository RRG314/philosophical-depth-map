import SiteHeader from "./components/SiteHeader";
import { lazy, useEffect, useRef, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import questionsData from "./data/questions.json";
import conceptData from "./data/concepts.json";
import edgeData from "./data/edges.json";

import {
  domains,
  labels,
  skills,
  rubric,
  emptyState,
  begin,
  summary,
  knowledge,
  xp,
  region,
  regions,
  badges,
  achievements,
  recommendations,
  parseImport,
  neighbours,
  type Question,
  type Concept,
  type Edge,
  type State,
  type Active,
  type Answer,
  type Skill,
  type Domain,
} from "./lib/model";
import { load, save } from "./lib/storage";
const Expedition = lazy(() => import("./game/ExpeditionPage"));
const qs = questionsData as Question[],
  concepts = conceptData as Concept[],
  edges = edgeData as Edge[];
const graphNodes = [
  ...qs.map((q) => ({
    id: q.id,
    kind: "question",
    label: q.title,
    domain: q.domain,
    description: q.prompt,
  })),
  ...qs.flatMap((q) => [
    ...q.branches.map((b, i) => ({
      id: `${q.id}-objection-${i}`,
      kind: "objection",
      label: b.label,
      domain: q.domain,
      description: b.prompt,
    })),
    ...q.sampleAnchors.flatMap((a, i) => [
      {
        id: `${q.id}-position-${i}`,
        kind: "position",
        label: `Illustrative response ${i + 1}: ${q.title}`,
        domain: q.domain,
        description: a.answer,
      },
      {
        id: `${q.id}-argument-${i}`,
        kind: "argument",
        label: `Editorial reasoning assessment ${i + 1}`,
        domain: q.domain,
        description: a.rationale,
      },
    ]),
  ]),
];
const assessment = qs
  .filter((q) => q.assessment)
  .sort((a, b) => a.id.localeCompare(b.id));
const routes = [
  ["explore", "Start exploring"],
  ["expedition", "3D expedition"],
  ["assessment", "Assessment"],
  ["map", "Philosophy map"],
  ["progress", "My progress"],
  ["achievements", "Achievements"],
  ["library", "Philosophy library"],
  ["about", "About"],
  ["scoring", "How scoring works"],
  ["research", "Research & methodology"],
  ["privacy", "Privacy & data"],
  ["accessibility", "Accessibility"],
  ["settings", "Settings"],
];
const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
const go = (path: string) => {
  location.hash = path;
};
function Diver({ state = "idle" }: { state?: string }) {
  return (
    <svg className={`diver ${state}`} viewBox="0 0 130 80" aria-hidden="true">
      <path
        d="M17 61l25-18 12 7-21 18M28 68l-17 2 2-9"
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M46 44l32-9 12 15-33 13z" fill="#efb766" />
      <rect
        x="44"
        y="29"
        width="31"
        height="13"
        rx="6"
        fill="#84cfc4"
        transform="rotate(-17 44 29)"
      />
      <circle cx="92" cy="35" r="17" fill="#f4dfb9" />
      <rect x="89" y="25" width="24" height="14" rx="6" fill="#143f4a" />
      <path
        d="M65 52l27 10 16-7"
        stroke="#efb766"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="117" cy="16" r="3" fill="none" stroke="#a9dcd5" />
      <circle cx="122" cy="5" r="2" fill="#a9dcd5" />
    </svg>
  );
}
function Ocean({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ocean ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 600 600"
        role="img"
        aria-label="An illustrated diver above layered ocean contours"
      >
        <defs>
          <linearGradient id="sea" x2="0" y2="1">
            <stop stopColor="#428a8e" />
            <stop offset="1" stopColor="#072b3d" />
          </linearGradient>
        </defs>
        <rect width="600" height="600" fill="url(#sea)" />
        <path
          d="M-50 40Q130 150 330 30T650 60M-50 100Q170 230 340 95T650 140M-30 165Q170 300 380 160T650 195M-10 245Q180 370 410 225T650 285M-30 330Q190 455 430 320T650 375M-30 415Q230 510 430 435T670 440M-30 500Q280 610 660 500"
          fill="none"
          stroke="#b1d8ca"
          strokeOpacity=".28"
          strokeWidth="2"
        />
        <path
          d="M70 0L170 450 270 0M330 0L430 410 500 0"
          fill="#fff8ce"
          opacity=".06"
        />
        <g fill="#a9d6cb">
          <circle cx="124" cy="244" r="4" />
          <circle cx="470" cy="145" r="3" />
          <circle cx="347" cy="428" r="4" />
        </g>
        <path d="M0 560Q100 490 200 580T440 565T650 535V600H0" fill="#0a2634" />
        <path
          d="M490 580v-68m0 26l-15-12m15-1l16-18m-360 77v-40m0 17l-14-10"
          stroke="#67a29d"
          strokeWidth="5"
          fill="none"
        />
      </svg>
      <div className="ocean-diver">
        <Diver state="swim" />
      </div>
      <span className="ocean-caption">A question is a place to begin.</span>
      <div className="depth-rule">
        00 — SURFACE
        <br />
        <br />
        01 — CURIOSITY
        <br />
        <br />
        02 — CONNECTION
      </div>
    </div>
  );
}
export default function App() {
  const [state, setState] = useState<State | null>(null),
    [route, setRoute] = useState(location.hash.slice(1) || "home"),
    [notice, setNotice] = useState(""),
    [domain, setDomain] = useState<Domain>("ethics"),
    [search, setSearch] = useState(""),
    [diving, setDiving] = useState(false),
    [ai, setAi] = useState(""),
    [busy, setBusy] = useState(false);
  const main = useRef<HTMLElement>(null),
    writeQueue = useRef(Promise.resolve());
  useEffect(() => {
    load()
      .then(setState)
      .catch(() => {
        setNotice(
          "Local storage could not be read. Export your work before leaving; this session may not persist.",
        );
        setState(emptyState());
      });
    const h = () => {
      setRoute(location.hash.slice(1) || "home");
      setAi("");
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  useEffect(() => {
    main.current?.focus();
  }, [route, state?.active?.stage, state?.active?.questionId]);
  useEffect(() => {
    if (!diving) return;
    const timer = setTimeout(() => setDiving(false), 3400);
    return () => clearTimeout(timer);
  }, [diving]);
  useEffect(() => {
    if (state)
      writeQueue.current = writeQueue.current
        .then(() => save(state))
        .catch(() =>
          setNotice(
            "Saving failed. Please export your progress before closing.",
          ),
        );
  }, [state]);
  useEffect(() => {
    if (!state) return;
    document.documentElement.dataset.motion = String(state.settings.motion);
    const w = window as unknown as {
      render_game_to_text: () => string;
      advanceTime: (ms: number) => void;
    };
    if (route.split("/")[0] === "expedition") return;
    w.render_game_to_text = () =>
      JSON.stringify({
        route,
        mode: state.active?.mode || "browse",
        stage: state.active?.stage,
        question: state.active?.questionId,
        completed: state.answers.length,
        xp: xp(state),
        region: region(state),
        diving,
        coordinates: "SVG origin top-left; x right, y down",
      });
    w.advanceTime = (ms) => {
      if (ms >= 3000) setDiving(false);
    };
  }, [state, route, diving]);
  if (!state)
    return (
      <main className="loading">
        <h1>Opening your field journal…</h1>
      </main>
    );
  const s = state;
  const update = (fn: (s: State) => State) =>
    setState((old) => (old ? fn(old) : old));
  const active = s.active,
    q = active ? qs.find((q) => q.id === active.questionId) : undefined;
  const patch = (p: Partial<Active>) =>
    update((s) => ({ ...s, active: s.active ? { ...s.active, ...p } : null }));
  const rating = active?.ratingDraft || {};
  const setRating = (
    value:
      | Partial<
          Record<Skill, { score: string; evidence: string; reason: string }>
        >
      | ((r: typeof rating) => typeof rating),
  ) =>
    patch({ ratingDraft: typeof value === "function" ? value(rating) : value });
  const start = (question: Question, mode: Active["mode"] = "explore") => {
    setRating({});
    update((s) => ({ ...s, active: begin(question, mode) }));
    go("play");
  };
  const toggleSave = (id: string) =>
    update((s) => ({
      ...s,
      saved: s.saved.includes(id)
        ? s.saved.filter((x) => x !== id)
        : [...s.saved, id],
    }));
  function complete(e: FormEvent) {
    e.preventDefault();
    if (!active || !q) return;
    const timestamp = new Date().toISOString();
    const ratings = q.skills.map((d) => {
      const r = rating[d];
      return {
        dimension: d,
        score: r && r.score !== "" ? Number(r.score) : null,
        max: 4 as const,
        evidence: r?.evidence || "",
        reason: r?.reason || "",
        rater: "self" as const,
        rubricVersion: "reasoning-1.0" as const,
        timestamp,
      };
    });
    if (
      ratings.some(
        (r) =>
          r.score !== null &&
          (!r.evidence.trim() ||
            ![active.position, active.explanation, active.reply].some((t) =>
              t.includes(r.evidence),
            )),
      )
    ) {
      setNotice(
        "For each observed score, paste an exact excerpt from one of your answers. Otherwise choose Not observed.",
      );
      return;
    }
    const a: Answer = {
      id: crypto.randomUUID(),
      questionId: q.id,
      itemVersion: q.version,
      mode: active.mode,
      sessionId: active.sessionId,
      position: active.position,
      explanation: active.explanation,
      reply: active.reply,
      choice: active.choice,
      revised: active.revised,
      assumptionNoted: active.assumptionNoted,
      uncertain: active.uncertain,
      branch: active.branch,
      ratings,
      timestamp,
    };
    const next =
      active.mode === "assessment" ? assessment[active.index + 1] : null;
    update((s) => ({
      ...s,
      answers: [...s.answers, a],
      discovered:
        active.mode === "assessment"
          ? s.discovered
          : [
              ...new Set(
                [
                  ...s.discovered,
                  ...q.concepts,
                  q.branches[active.branch]?.concept,
                ].filter(Boolean),
              ),
            ],
      active: next
        ? begin(next, "assessment", active.index + 1, active.sessionId)
        : null,
    }));
    setRating({});
    setNotice(
      next
        ? "Answer saved. Continue to the next fixed item."
        : "Your reflection is saved on this device.",
    );
    if (!next) {
      setDiving(s.settings.motion);
      go("results");
    }
  }
  async function askAI() {
    if (!endpoint || !q || !active || !s.settings.aiConsent) return;
    setBusy(true);
    setAi("");
    try {
      const r = await fetch(endpoint + "/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          answer: [active.position, active.explanation, active.reply].join(
            "\n",
          ),
          consent: true,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const body = (await r.json()) as { error?: string; question?: unknown };
      if (!r.ok) throw Error(body.error || "Guide unavailable");
      if (typeof body.question !== "string")
        throw Error("Invalid guide response");
      setAi(body.question);
    } catch {
      setAi(
        "The optional guide is unavailable. Your local progress is safe; the fixed prompts still work.",
      );
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "depth-map-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Export created. It contains your private written reflections.");
  }
  const cards = (items: Question[]) => (
    <div className="cards">
      {items.map((item) => (
        <article className="card" key={item.id}>
          <span className="eyebrow">
            {labels[item.domain]} · {item.responseType}
          </span>
          <h3>{item.title}</h3>
          <p>{item.prompt}</p>
          <div className="card-actions">
            <button onClick={() => start(item)}>
              Explore question <span aria-hidden="true">↗</span>
            </button>
            <button
              className="quiet"
              aria-label={`${s.saved.includes(item.id) ? "Unsave" : "Save"} ${item.title}`}
              onClick={() => toggleSave(item.id)}
            >
              {s.saved.includes(item.id) ? "Saved ✓" : "Save"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
  const profile = (items: Answer[]) => {
    const k = knowledge(items, qs);
    return (
      <>
        <div className="metrics">
          <article>
            <span className="eyebrow">Exploration</span>
            <strong>{xp(s)} XP</strong>
            <p>{region(s)} · milestones, not a ranking</p>
          </article>
          <article>
            <span className="eyebrow">Knowledge checks</span>
            <strong>{k.n ? `${k.correct} / ${k.n}` : "Not observed"}</strong>
            <p>
              Concept checks only, including repeated attempts. No normative
              comparison.
            </p>
          </article>
          <article>
            <span className="eyebrow">Evidence coverage</span>
            <strong>{items.length} responses</strong>
            <p>
              {
                new Set(
                  items.map(
                    (a) => qs.find((q) => q.id === a.questionId)?.domain,
                  ),
                ).size
              }{" "}
              of 8 domains visited
            </p>
          </article>
        </div>
        <h2>Your reasoning evidence</h2>
        <p>
          Self-reflection ratings, not validated proficiency estimates. NA is
          excluded. A range describes these observations; it is not a confidence
          interval.
        </p>
        <div className="skill-grid">
          {skills.map((d) => {
            const x = summary(items, d);
            return (
              <article className="skill" key={d}>
                <h3>{d}</h3>
                <strong>
                  {x.mean === null
                    ? "Not assessed"
                    : `${x.mean.toFixed(1)} / 4`}
                </strong>
                <p>
                  {x.n} observed · {x.na} NA
                  {x.range ? ` · range ${x.range.join("–")}` : ""}
                </p>
                <meter
                  aria-label={`${d} self-reflection mean`}
                  min="0"
                  max="4"
                  value={x.mean || 0}
                />
              </article>
            );
          })}
        </div>
        <details>
          <summary>Evidence by domain and skill</summary>
          {domains.map((domain) => (
            <article key={domain}>
              <h3>{labels[domain]}</h3>
              <ul>
                {skills.map((d) => {
                  const x = summary(
                    items.filter(
                      (a) =>
                        qs.find((q) => q.id === a.questionId)?.domain ===
                        domain,
                    ),
                    d,
                  );
                  return (
                    <li key={d}>
                      {d}:{" "}
                      {x.mean === null
                        ? "Not assessed"
                        : `${x.mean.toFixed(1)} / 4`}{" "}
                      · {x.n} observed · {x.na} NA
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </details>
        <details>
          <summary>Inspect saved evidence and rating explanations</summary>
          {items.map((a) => (
            <article key={a.id}>
              <h3>{qs.find((q) => q.id === a.questionId)?.title}</h3>
              <p>{a.position}</p>
              <p>{a.explanation}</p>
              <blockquote>{a.reply}</blockquote>
              {a.ratings.map((r) => (
                <p key={r.dimension}>
                  {r.dimension}: {r.score ?? "NA"} · self · {r.rubricVersion}
                  <br />
                  Evidence: {r.evidence || "Not observed"}
                  <br />
                  {r.reason}
                </p>
              ))}
            </article>
          ))}
        </details>
      </>
    );
  };
  const page = route.split("/")[0];
  return (
    <>
      <a
        className="skip"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} ref={main}>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              className="quiet"
              aria-label="Dismiss notice"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {page === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">A FIELD GUIDE TO YOUR OWN THINKING</p>
                <h1>
                  How deep does
                  <br />a question go?
                </h1>
                <p className="lead">
                  Start with a question. Follow your reasoning.
                  <br />
                  See where it takes you.
                </p>
                <a className="button" id="start-btn" href="#explore">
                  Take your first dive <span aria-hidden="true">↗</span>
                </a>
                <p>
                  <a className="button" href="#expedition">
                    Enter the 3D ocean →
                  </a>
                </p>
                <p className="small">
                  No account. No right worldview. A little curiosity.
                </p>
                {s.active && <a href="#play">Continue your saved session →</a>}
              </div>
              <Ocean />
            </section>
            <section className="intro-strip">
              <span>01 &nbsp; Take a position</span>
              <span>02 &nbsp; Meet an objection</span>
              <span>03 &nbsp; Follow the connection</span>
            </section>
            <section className="section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">EIGHT WAYS INTO THE WATER</p>
                  <h2>What has you wondering?</h2>
                </div>
                <a href="#explore">All questions →</a>
              </div>
              <div className="domain-grid">
                {domains.map((d, i) => (
                  <a
                    className="domain-card"
                    href="#explore"
                    key={d}
                    onClick={() => setDomain(d)}
                  >
                    <span className="domain-number">0{i + 1}</span>
                    <h3>{labels[d]}</h3>
                    <p>
                      {
                        [
                          "What do we owe each other?",
                          "What makes a belief trustworthy?",
                          "Does the conclusion follow?",
                          "What does it mean to exist?",
                          "What is it like to be you?",
                          "Who should get to decide?",
                          "What makes something art?",
                          "How do explanations earn trust?",
                        ][i]
                      }
                    </p>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </section>
            <section className="invitation">
              <p className="eyebrow">A MAP, NOT A VERDICT</p>
              <h2>
                You can change your mind.
                <br />
                You can also explain why you haven’t.
              </h2>
              <p>
                The ocean tracks what you explore. Separate evidence summaries
                show what you chose to assess. Neither measures your worth or
                intelligence.
              </p>
              <a href="#scoring">Understand the distinction →</a>
            </section>
          </>
        )}
        {page === "explore" && (
          <section className="section">
            <p className="eyebrow">CHOOSE A CURRENT</p>
            <h1>Start exploring</h1>
            <p>
              A short answer is welcome. You can question the question, remain
              uncertain, or defend your position.
            </p>
            {s.active && (
              <p>
                <a className="button secondary" href="#play">
                  Resume saved {s.active.mode} session
                </a>{" "}
                <small>
                  Starting another question replaces only your unfinished draft.
                </small>
              </p>
            )}
            <div className="filters">
              <label>
                Area
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as Domain)}
                >
                  {domains.map((d) => (
                    <option value={d} key={d}>
                      {labels[d]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Find a question
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            {cards(
              qs.filter(
                (q) =>
                  q.domain === domain &&
                  `${q.title} ${q.prompt}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              ),
            )}
          </section>
        )}
        {page === "assessment" && (
          <section className="reading">
            <p className="eyebrow">A FIXED INTRODUCTORY PATH</p>
            <h1>A snapshot of your reasoning</h1>
            <p>
              Sixteen questions across eight areas, in the same order for
              everyone. Each has a fixed follow-up. Pause at any point and
              resume on this device.
            </p>
            <p>
              Knowledge checks have explained answers. Written reasoning is not
              automatically graded: you can use the rubric to reflect on
              evidence, or leave it unobserved. This is an unvalidated
              introductory assessment, not a diagnostic test.
            </p>
            <button onClick={() => start(assessment[0], "assessment")}>
              Begin assessment
            </button>
            {s.active?.mode === "assessment" && (
              <a className="button secondary" href="#play">
                Resume assessment
              </a>
            )}
            <a className="block-link" href="#scoring">
              Read the scoring rules first →
            </a>
          </section>
        )}
        {page === "play" &&
          (!q || !active ? (
            <section className="reading">
              <h1>No unfinished session</h1>
              <a href="#explore">Choose a question →</a>
            </section>
          ) : (
            <section className="session">
              <aside className="session-side">
                <p className="eyebrow">{labels[q.domain]}</p>
                <h2>
                  {active.mode === "assessment"
                    ? `Item ${active.index + 1} of ${assessment.length}`
                    : "Your next question"}
                </h2>
                <ol className="steps">
                  <li aria-current={active.stage === 0 ? "step" : undefined}>
                    Your position
                  </li>
                  <li aria-current={active.stage === 1 ? "step" : undefined}>
                    Another perspective
                  </li>
                  <li aria-current={active.stage === 2 ? "step" : undefined}>
                    Reflect & connect
                  </li>
                </ol>
                <p>Saved locally as you write.</p>
                <button className="secondary" onClick={() => toggleSave(q.id)}>
                  {s.saved.includes(q.id)
                    ? "Unsave question"
                    : "Save for later"}
                </button>
                <a className="block-link" href="#progress">
                  Pause & open journal
                </a>
              </aside>
              <div className="session-main" key={q.id + active.stage}>
                <span className="eyebrow">
                  {q.responseType} · {q.difficultyHypothesis} hypothesis
                </span>
                <h1>{q.title}</h1>
                <p className="prompt">{q.prompt}</p>
                {active.stage === 0 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      patch({ stage: 1 });
                    }}
                  >
                    {q.options ? (
                      <fieldset>
                        <legend>Choose a response</legend>
                        {q.options.map((option, i) => (
                          <label className="option" key={option}>
                            <input
                              type="radio"
                              name="choice"
                              required
                              checked={active.choice === i}
                              onChange={() =>
                                patch({ choice: i, position: option })
                              }
                            />
                            {option}
                          </label>
                        ))}
                      </fieldset>
                    ) : (
                      <label>
                        Your position or reconstruction
                        <textarea
                          required
                          maxLength={6000}
                          value={active.position}
                          onChange={(e) => patch({ position: e.target.value })}
                          placeholder="A sentence can be enough to begin."
                        />
                      </label>
                    )}
                    <label>
                      What leads you there?
                      <textarea
                        required
                        maxLength={6000}
                        value={active.explanation}
                        onChange={(e) => patch({ explanation: e.target.value })}
                        placeholder="Give a reason, identify a doubt, or challenge the premise."
                      />
                    </label>
                    <button type="submit">Meet another perspective →</button>
                  </form>
                )}
                {active.stage === 1 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      patch({ stage: 2 });
                    }}
                  >
                    <div className="objection">
                      <p className="eyebrow">A QUESTION TO SIT WITH</p>
                      <p>
                        {active.mode === "assessment"
                          ? q.followup
                          : q.branches[active.branch]?.prompt || q.followup}
                      </p>
                    </div>
                    {active.mode === "explore" && (
                      <label>
                        Choose an angle
                        <select
                          value={active.branch}
                          onChange={(e) =>
                            patch({ branch: Number(e.target.value) })
                          }
                        >
                          {q.branches.map((b, i) => (
                            <option value={i} key={i}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Your response
                      <textarea
                        required
                        maxLength={6000}
                        value={active.reply}
                        onChange={(e) => patch({ reply: e.target.value })}
                        placeholder="Defend, revise, qualify, or explain what remains unresolved."
                      />
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={active.revised}
                        onChange={(e) => patch({ revised: e.target.checked })}
                      />
                      I revised or qualified my position.
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={active.assumptionNoted}
                        onChange={(e) =>
                          patch({ assumptionNoted: e.target.checked })
                        }
                      />
                      I examined an assumption.
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={active.uncertain}
                        onChange={(e) => patch({ uncertain: e.target.checked })}
                      />
                      I’m leaving something unresolved.
                    </label>
                    <button type="submit">Reflect & connect →</button>
                    <button
                      type="button"
                      className="quiet"
                      onClick={() => patch({ stage: 0 })}
                    >
                      Back to my position
                    </button>
                  </form>
                )}
                {active.stage === 2 && (
                  <form onSubmit={complete}>
                    <h2>A concept to carry with you</h2>
                    <p>{q.explanation}</p>
                    <div className="tags">
                      {q.concepts.map((id) => (
                        <a key={id} href={"#library/" + id}>
                          {concepts.find((c) => c.id === id)?.label || id}
                        </a>
                      ))}
                    </div>
                    <h2>Optional self-reflection</h2>
                    <p>
                      Leave a dimension unobserved unless you have evidence.
                      These are your own descriptive ratings, not a scientific
                      grade. Brevity, disagreement and uncertainty are not
                      penalties.
                    </p>
                    {q.skills.map((d) => (
                      <details className="rating" key={d}>
                        <summary>{d}</summary>
                        <ol start={0}>
                          {rubric[d].map((anchor, i) => (
                            <li key={i}>{anchor}</li>
                          ))}
                        </ol>
                        <label>
                          Observed level
                          <select
                            value={rating[d]?.score ?? ""}
                            onChange={(e) =>
                              setRating((r) => ({
                                ...r,
                                [d]: {
                                  score: e.target.value,
                                  evidence: r[d]?.evidence || "",
                                  reason: r[d]?.reason || "",
                                },
                              }))
                            }
                          >
                            <option value="">Not observed / NA</option>
                            {[0, 1, 2, 3, 4].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Exact evidence excerpt
                          <input
                            value={rating[d]?.evidence || ""}
                            maxLength={6000}
                            onChange={(e) =>
                              setRating((r) => ({
                                ...r,
                                [d]: {
                                  score: r[d]?.score ?? "",
                                  evidence: e.target.value,
                                  reason: r[d]?.reason || "",
                                },
                              }))
                            }
                          />
                        </label>
                        <label>
                          Why this anchor fits
                          <input
                            value={rating[d]?.reason || ""}
                            maxLength={2000}
                            onChange={(e) =>
                              setRating((r) => ({
                                ...r,
                                [d]: {
                                  score: r[d]?.score ?? "",
                                  evidence: r[d]?.evidence || "",
                                  reason: e.target.value,
                                },
                              }))
                            }
                          />
                        </label>
                      </details>
                    ))}
                    <details>
                      <summary>Worked examples for this question</summary>
                      <p>
                        These examples illustrate particular moves, not a
                        validated overall score. A well-supported opposing
                        answer can be equally strong; assess each rubric
                        dimension separately.
                      </p>
                      {q.sampleAnchors.map((a, i) => (
                        <p key={i}>
                          <b>Editorial example {i + 1}:</b> {a.answer}
                          <br />
                          {a.rationale}
                        </p>
                      ))}
                    </details>
                    <button type="submit">
                      {active.mode === "assessment" &&
                      active.index < assessment.length - 1
                        ? "Save & next item"
                        : "Save & finish dive"}
                    </button>
                  </form>
                )}
                {active.mode === "explore" && (
                  <details className="ai-panel">
                    <summary>Optional AI Socratic guide</summary>
                    {!endpoint ? (
                      <p>
                        No AI service is connected. These are curated prompts,
                        not simulated AI responses.
                      </p>
                    ) : !s.settings.aiConsent ? (
                      <p>
                        AI sends this question and your written response to a
                        third-party provider.{" "}
                        <a href="#settings">
                          Review the disclosure and opt in.
                        </a>
                      </p>
                    ) : (
                      <>
                        <button disabled={busy} onClick={askAI}>
                          {busy
                            ? "Asking…"
                            : "Send this response & ask a follow-up"}
                        </button>
                        <p role="status">{ai}</p>
                      </>
                    )}
                  </details>
                )}
                <details>
                  <summary>Question sources and status</summary>
                  <p>
                    {q.id} · version {q.version} · {q.editorialStatus} ·{" "}
                    {q.calibrationStatus}
                  </p>
                  {q.references.map((r) => (
                    <a
                      className="block-link"
                      href={r}
                      key={r}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read philosophical reference ↗
                    </a>
                  ))}
                </details>
              </div>
            </section>
          ))}
        {page === "expedition" && (
          <Expedition state={s} questions={qs} onStart={start} />
        )}
        {page === "results" && (
          <section className="section">
            {diving ? (
              <div className="dive-scene">
                <h1>Your latest dive</h1>
                <div
                  className="dive-water"
                  style={
                    {
                      "--dive-distance": `${regions.indexOf(region(s)) * 51}px`,
                    } as CSSProperties
                  }
                >
                  <Diver state="descent" />
                  {regions.map((r, i) => (
                    <p key={r} style={{ top: `${i * 12 + 4}%` }}>
                      {r}
                      {r === region(s) ? " ← Your exploration milestone" : ""}
                    </p>
                  ))}
                  <div className="dive-concepts">
                    {s.discovered.slice(-3).map((id) => (
                      <span key={id}>
                        {concepts.find((c) => c.id === id)?.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setDiving(false)}>
                  Skip animation & show results
                </button>
                <p>Exploration milestones are not ability levels.</p>
              </div>
            ) : (
              <>
                <p className="eyebrow">BACK AT THE SURFACE</p>
                <h1>What you’re bringing back</h1>
                <a className="button primary" href="#expedition">
                  Return to your expedition →
                </a>
                {profile(
                  s.answers.filter(
                    (a) => a.sessionId === s.answers.at(-1)?.sessionId,
                  ),
                )}
                {s.saved.length > 0 && (
                  <p>
                    <a href="#progress">
                      Revisit your {s.saved.length} saved questions →
                    </a>
                  </p>
                )}
                <h2>Follow another connection</h2>
                <p>
                  Suggestions use your chosen angle, unexplored ideas,
                  unresolved questions and opportunities for evidence. They do
                  not infer your ability.
                </p>
                {cards(
                  recommendations(
                    s,
                    qs,
                    qs.find((q) => q.id === s.answers.at(-1)?.questionId),
                  ),
                )}
                <a href="#progress">Open your complete journal →</a>
              </>
            )}
          </section>
        )}
        {page === "progress" && (
          <section className="section">
            <p className="eyebrow">YOUR PRIVATE FIELD JOURNAL</p>
            <h1>{s.profile}’s progress</h1>
            {s.active && (
              <a className="button" href="#play">
                Continue unfinished session →
              </a>
            )}
            {profile(s.answers)}
            <h2>Saved questions</h2>
            {s.saved.length ? (
              cards(qs.filter((q) => s.saved.includes(q.id)))
            ) : (
              <p>Save a question while exploring to return to it here.</p>
            )}
            <h2>History & revisions</h2>
            {s.answers.length ? (
              s.answers
                .slice()
                .reverse()
                .map((a) => (
                  <details key={a.id}>
                    <summary>
                      {qs.find((q) => q.id === a.questionId)?.title} ·{" "}
                      {a.revised ? "Revised / qualified" : "Considered"} ·{" "}
                      {new Date(a.timestamp).toLocaleDateString()}
                    </summary>
                    <p>{a.position}</p>
                    <p>{a.explanation}</p>
                    <blockquote>{a.reply}</blockquote>
                    <button
                      onClick={() =>
                        start(qs.find((q) => q.id === a.questionId)!)
                      }
                    >
                      Revisit this question
                    </button>
                  </details>
                ))
            ) : (
              <p>Your first dive will start your journal.</p>
            )}
            <button onClick={exportData}>Export progress</button>
          </section>
        )}
        {page === "map" && (
          <section className="section">
            <p className="eyebrow">IDEAS CONNECT IN MORE THAN ONE DIRECTION</p>
            <h1>Your philosophy map</h1>
            <p>
              Nodes mark encounters, not mastery. Lines show curated
              relationships; disputed connections are labelled.
            </p>
            <label>
              Explore an area
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as Domain)}
              >
                {domains.map((d) => (
                  <option value={d} key={d}>
                    {labels[d]}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="map-wrap"
              tabIndex={0}
              role="region"
              aria-label="Scrollable concept map"
            >
              <svg
                viewBox="0 0 850 420"
                role="group"
                aria-label={`Concept overview for ${labels[domain]}. All nodes and connections are available in the list below.`}
              >
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0 0L7 3L0 6" fill="#88bdb4" />
                  </marker>
                </defs>
                {(() => {
                  const area = concepts.filter((c) => c.domain === domain);
                  const linked = edges
                    .filter(
                      (e) =>
                        concepts.some((c) => c.id === e.from) &&
                        concepts.some((c) => c.id === e.to) &&
                        (area.some((c) => c.id === e.from) ||
                          area.some((c) => c.id === e.to)),
                    )
                    .slice(0, 5)
                    .flatMap((e) => [e.from, e.to]);
                  const visible = [
                    ...new Set([...linked, ...area.map((c) => c.id)]),
                  ]
                    .slice(0, 10)
                    .map((id) => concepts.find((c) => c.id === id)!);
                  const pos = (id: string) => {
                    const i = visible.findIndex((c) => c.id === id);
                    return {
                      x: 95 + (i % 5) * 165,
                      y: 100 + Math.floor(i / 5) * 205,
                    };
                  };
                  return (
                    <>
                      {edges
                        .filter(
                          (e) =>
                            visible.some((c) => c.id === e.from) &&
                            visible.some((c) => c.id === e.to),
                        )
                        .map((e) => {
                          const a = pos(e.from),
                            b = pos(e.to);
                          const angle = Math.atan2(b.y - 210, b.x - 425);
                          const end = {
                            x: b.x - Math.cos(angle) * 28,
                            y: b.y - Math.sin(angle) * 28,
                          };
                          return (
                            <path
                              key={e.id}
                              d={`M${a.x} ${a.y} Q425 210 ${end.x} ${end.y}`}
                              stroke="#88bdb4"
                              strokeDasharray={e.contested ? "6 4" : undefined}
                              markerEnd="url(#arrow)"
                              fill="none"
                              opacity=".6"
                            >
                              <title>
                                {e.from} {e.type} {e.to}
                                {e.contested ? " (contested)" : ""}
                              </title>
                            </path>
                          );
                        })}
                      {visible.map((c) => {
                        const { x, y } = pos(c.id);
                        return (
                          <a
                            key={c.id}
                            href={"#library/" + c.id}
                            aria-label={c.label}
                          >
                            <circle
                              cx={x}
                              cy={y}
                              r={s.discovered.includes(c.id) ? 22 : 13}
                              fill={
                                s.discovered.includes(c.id)
                                  ? "#f0bf79"
                                  : "#85b9b1"
                              }
                            />
                            <text
                              x={x}
                              y={y + 44}
                              textAnchor="middle"
                              fill="#f5f1e8"
                              fontSize="13"
                            >
                              {c.label.length > 22
                                ? c.label.slice(0, 20) + "…"
                                : c.label}
                            </text>
                          </a>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <p className="small">
              Ten concepts from this area and its neighbors. Arrows show actual
              directed relationships; dashed lines mark contested claims. On
              small screens, scroll the map horizontally or use the complete
              text view below.
            </p>
            <h2>Questions, positions, arguments and objections</h2>
            <details>
              <summary>Explore the other node types in this area</summary>
              {graphNodes
                .filter((n) => n.domain === domain && n.kind !== "concept")
                .map((n) => (
                  <details key={n.id}>
                    <summary>
                      {n.kind}: {n.label}
                    </summary>
                    <p>{n.description}</p>
                    <ul>
                      {edges
                        .filter((e) => e.from === n.id || e.to === n.id)
                        .map((e) => (
                          <li key={e.id}>
                            {e.from} — {e.type} → {e.to}. {e.note}
                            {e.contested ? " (contested)" : ""}
                          </li>
                        ))}
                    </ul>
                  </details>
                ))}
            </details>
            <h2>Accessible map and relationships</h2>
            {concepts
              .filter((c) => c.domain === domain)
              .map((c) => (
                <details key={c.id}>
                  <summary>
                    {s.discovered.includes(c.id) ? "Discovered · " : ""}
                    {c.label}
                  </summary>
                  <p>{c.description}</p>
                  <a href={"#library/" + c.id}>Open concept →</a>
                  <ul>
                    {edges
                      .filter((e) => e.from === c.id || e.to === c.id)
                      .map((e) => (
                        <li key={e.id}>
                          {e.from} — {e.type} → {e.to}
                          {e.contested ? " (contested)" : ""}. {e.note}
                        </li>
                      ))}
                  </ul>
                  <p>{neighbours(c.id, edges).length} linked nodes</p>
                  {cards(
                    qs.filter((q) => q.concepts.includes(c.id)).slice(0, 2),
                  )}
                </details>
              ))}
          </section>
        )}
        {page === "library" && (
          <section className="section">
            <p className="eyebrow">A SMALL COMPANION LIBRARY</p>
            <h1>Ideas worth spending time with</h1>
            <label>
              Search concepts
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="cards">
              {concepts
                .filter((c) =>
                  route.includes("/")
                    ? c.id === route.split("/")[1]
                    : `${c.label} ${c.description}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                )
                .map((c) => (
                  <article className="card" key={c.id}>
                    <span className="eyebrow">{labels[c.domain]}</span>
                    <h2>{c.label}</h2>
                    <p>{c.description}</p>
                    <a href={c.reference} target="_blank" rel="noreferrer">
                      Read the source ↗
                    </a>
                    <h3>Try this idea</h3>
                    {qs
                      .filter((q) => q.concepts.includes(c.id))
                      .slice(0, 2)
                      .map((q) => (
                        <button
                          className="block-link quiet"
                          key={q.id}
                          onClick={() => start(q)}
                        >
                          {q.title} →
                        </button>
                      ))}
                  </article>
                ))}
            </div>
            {route.includes("/") && <a href="#library">Back to all concepts</a>}
          </section>
        )}
        {page === "achievements" && (
          <section className="section">
            <p className="eyebrow">MARKERS OF EXPLORATION</p>
            <h1>Things you’ve tried</h1>
            <p>
              No streaks, deadlines, or penalties for changing your mind. These
              mark actions, not proven abilities.
            </p>
            <div className="cards">
              {badges.map(([name, desc], i) => (
                <article className="card" key={name}>
                  <span className="eyebrow">
                    {achievements(s, qs)[i] ? "Earned ✓" : "Not yet"}
                  </span>
                  <h2>{name}</h2>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {page === "about" && (
          <article className="reading">
            <h1>A place to examine a question</h1>
            <p>
              Philosophical Depth Map invites you to make your reasons visible,
              try a different perspective, and notice connections. It does not
              prescribe a political position, religious belief, or philosophical
              tradition.
            </p>
            <h2>Why “depth”?</h2>
            <p>
              Here, depth is an invitation to examine premises, values and
              implications. The ocean records exploration. It is not a measure
              of intelligence or moral character.
            </p>
            <p>
              The research project asks whether aspects of this reasoning can be
              described responsibly. “Philosophical deficit” is an unvalidated
              proposed construct, not a condition we diagnose.
            </p>
            <a href="#research">Read the research boundaries →</a>
          </article>
        )}
        {page === "scoring" && (
          <article className="reading">
            <h1>What the numbers mean</h1>
            <h2>Three separate profiles</h2>
            <p>
              Knowledge checks test selected concepts and argument
              comprehension. Reasoning ratings describe evidence in particular
              answers. Exploration XP gives 10 points per distinct, nonblank
              exploration. Assessments, self-ratings and revising rather than
              retaining a position earn no bonus. None can substitute for the
              others.
            </p>
            <h2>Transparent summaries</h2>
            <p>
              For each dimension: mean = sum of observed scores / number of
              applicable observed ratings. Each observation has maximum 4.
              Missing and NA ratings never enter the denominator. We show counts
              and observed ranges, not a population percentile or validated
              uncertainty interval.
            </p>
            <p>
              Ratings in the public game are self-reflections. No sentence
              length, jargon, agreement, or time spent determines a score.
              Uncertainty and criticism of a prompt can demonstrate strong
              reasoning. A revised contradiction can be evidence of reflection;
              a changed opinion is not automatically an improvement.
            </p>
            {skills.map((d) => (
              <section key={d}>
                <h2>{d}</h2>
                <ol start={0}>
                  {rubric[d].map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
              </section>
            ))}
            <p>
              Rubric version: reasoning-1.0. NA means the prompt offered no
              opportunity or evidence was not observed. Scoring examples on each
              question are illustrative and await independent expert review.
            </p>
          </article>
        )}
        {page === "research" && (
          <article className="reading">
            <h1>Research & methodology</h1>
            <p className="status-label">
              Unvalidated construct · research enrollment closed
            </p>
            <p>
              We separate philosophical arguments from empirical questions. A
              coherent rubric does not prove that a single depth trait exists,
              that reasoning transfers across domains, or that this game
              improves it.
            </p>
            <h2>What would need to be studied?</h2>
            <ol>
              <li>Construct analysis and independent expert review</li>
              <li>Blinded independent rater agreement</li>
              <li>Factor structure and convergent/discriminant validity</li>
              <li>Instrumental reasoning and foundational reflection</li>
              <li>Randomized AI, fixed-prompt and unaided comparisons</li>
              <li>AI–human agreement and style/tradition bias</li>
              <li>Delayed transfer and longitudinal change</li>
            </ol>
            <p>
              No study has run. No participant data, norms, calibrated
              difficulty or effectiveness findings are claimed.
            </p>
            <a
              href="https://plato.stanford.edu/entries/reflective-equilibrium/"
              target="_blank"
              rel="noreferrer"
            >
              Starting point: reflective equilibrium ↗
            </a>
            <p>
              Full source verification, study plans and analysis code are
              available in the project repository.
            </p>
            <p>
              <a
                href="https://github.com/RRG314/philosophical-depth-map/tree/main/research"
                target="_blank"
                rel="noreferrer"
              >
                Read the research documents ↗
              </a>
            </p>
            <a href="#privacy">Data and consent boundaries →</a>
          </article>
        )}
        {page === "privacy" && (
          <article className="reading">
            <h1>Your words stay yours</h1>
            <p>Privacy notice v1.0 · No research enrollment is open.</p>
            <h2>Local game data</h2>
            <p>
              Your answers, revisions, settings and progress live in this
              browser’s IndexedDB. There are no analytics or account
              requirements. Anyone with access to this browser profile may
              access them. Clearing browser storage can remove them; export a
              copy if you want a backup.
            </p>
            <h2>Optional AI</h2>
            <p>
              If a service is configured and you opt in, pressing the AI button
              sends the current question and response to that service and its
              model provider. Avoid including personal or sensitive information.
              The public game makes no background AI calls. Turning consent off
              prevents new requests; it does not retract data already processed
              by a provider.
            </p>
            <h2>Research data</h2>
            <p>
              Research submission is disabled. Local play is not research
              consent. Future research requires a separately approved protocol,
              versioned consent, adult eligibility, withdrawal process and a
              functioning backend. No local record is described as submitted.
            </p>
            <h2>Hosting</h2>
            <p>
              A hosting provider may receive ordinary request metadata when
              serving the site. The game itself does not create analytics
              cookies. Export files contain your written answers; share them
              deliberately.
            </p>
            <button onClick={exportData}>Export my local progress</button>
            <a className="block-link" href="#settings">
              Import or delete local data →
            </a>
          </article>
        )}
        {page === "accessibility" && (
          <article className="reading">
            <h1>Explore in your own way</h1>
            <p>
              The game uses keyboard-operable forms, visible focus, labelled
              controls, text alternatives for the map, and no timed answers.
              Reduced-motion preferences are respected; all animations can be
              disabled in Settings.
            </p>
            <p>
              It targets WCAG 2.2 AA. Automated checks are useful but do not
              certify full conformance. Assistive-technology and user testing
              remain necessary.
            </p>
            <a href="#settings">Change motion and companion preferences →</a>
          </article>
        )}
        {page === "settings" && (
          <section className="reading">
            <h1>Make room for your thinking</h1>
            <label>
              Local journal name
              <input
                value={s.profile}
                maxLength={40}
                onChange={(e) =>
                  update((s) => ({ ...s, profile: e.target.value }))
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={s.settings.motion}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, motion: e.target.checked },
                  }))
                }
              />
              Allow gentle motion
            </label>
            <p>Sound is muted. This version contains no audio.</p>
            <label>
              Diver companion
              <select
                value={s.settings.diver}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    settings: {
                      ...s.settings,
                      diver: e.target.value as State["settings"]["diver"],
                    },
                  }))
                }
              >
                <option value="expanded">Expanded</option>
                <option value="minimized">Minimized</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </label>
            <h2>Optional AI processing</h2>
            <p>
              {endpoint
                ? "A guide endpoint is configured."
                : "No AI endpoint is connected."}{" "}
              When requested, your current answer is sent to the configured
              service and OpenAI. AI feedback may be mistaken or biased. It does
              not determine your official profile.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={s.settings.aiConsent}
                onChange={(e) =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, aiConsent: e.target.checked },
                  }))
                }
              />
              I understand and allow sending a response when I press the AI
              button.
            </label>
            <h2>Progress files</h2>
            <button onClick={exportData}>Export progress</button>
            <label>
              Import a progress file (replaces this device’s journal)
              <input
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2_000_000) {
                    setNotice("File exceeds 2 MB.");
                    return;
                  }
                  try {
                    const parsed = parseImport(await file.text(), qs, concepts);
                    if (
                      confirm(
                        "Replace this journal with the imported file? Export first if you need a backup.",
                      )
                    ) {
                      setState(parsed);
                      setNotice(
                        "Imported and validated. AI consent has been reset.",
                      );
                    }
                  } catch {
                    setNotice(
                      "Import rejected. The file is invalid, incompatible, too large, or contains invalid evidence. Your existing data is unchanged.",
                    );
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <h2>Delete local data</h2>
            <p>
              This removes answers, drafts, settings, achievements and saved
              questions from this journal.
            </p>
            <button
              className="danger"
              onClick={async () => {
                if (
                  confirm(
                    "Delete all local game data? This cannot be undone unless you have an export.",
                  )
                ) {
                  try {
                    await writeQueue.current;
                    const reset = emptyState();
                    await save(reset);
                    setState(reset);
                    setNotice(
                      "Local journal reset. Previously downloaded exports are not deleted.",
                    );
                  } catch {
                    setNotice(
                      "The journal could not be cleared. Please try again.",
                    );
                  }
                }
              }}
            >
              Delete all local data
            </button>
          </section>
        )}
        {!["home", ...routes.map((r) => r[0]), "play", "results"].includes(
          page,
        ) && (
          <section className="reading">
            <h1>This current isn’t on the map</h1>
            <a href="#home">Return home</a>
          </section>
        )}
      </main>
      <footer>
        <a className="brand" href="#home">
          ◒ &nbsp; PHILOSOPHICAL DEPTH MAP
        </a>
        <p>A map of encounters. Room for uncertainty.</p>
        <nav aria-label="Footer">
          {[
            "about",
            "scoring",
            "research",
            "privacy",
            "accessibility",
            "settings",
          ].map((id) => (
            <a key={id} href={"#" + id}>
              {routes.find((r) => r[0] === id)?.[1]}
            </a>
          ))}
        </nav>
      </footer>
      {page !== "expedition" && s.settings.diver !== "dismissed" && (
        <aside
          className={`companion ${s.settings.diver}`}
          aria-label="Diver companion"
        >
          <Diver
            state={
              diving
                ? "descent"
                : page === "results"
                  ? "surface"
                  : page === "play"
                    ? "swim"
                    : "idle"
            }
          />
          {s.settings.diver === "expanded" && (
            <div>
              <p>
                {region(s)} · {xp(s)} exploration XP
              </p>
              <meter
                min="0"
                max={regions.length - 1}
                value={regions.indexOf(region(s))}
                aria-label="Exploration milestone"
              />
              <p className="small">What would change your mind?</p>
              <button
                className="quiet"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    settings: { ...s.settings, diver: "dismissed" },
                  }))
                }
              >
                Dismiss
              </button>
            </div>
          )}
          <button
            className="quiet"
            aria-label={
              s.settings.diver === "expanded"
                ? "Minimize diver"
                : "Expand diver"
            }
            onClick={() =>
              update((s) => ({
                ...s,
                settings: {
                  ...s.settings,
                  diver:
                    s.settings.diver === "expanded" ? "minimized" : "expanded",
                },
              }))
            }
          >
            {s.settings.diver === "expanded" ? "−" : "+"}
          </button>
        </aside>
      )}
    </>
  );
}
