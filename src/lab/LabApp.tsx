import { useEffect, useRef, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import rawProblems from "./data/problems.json";
import protocols from "./data/protocols.json";
import {
  problemSchema,
  blankAction,
  validateAction,
  methods,
  type Method,
  type Action,
  type Problem,
} from "./core/schema";
import { runEngine } from "./core/engine";
import {
  config,
  createSession,
  cursor,
  append,
  replay,
  blindExport,
  validateSession,
  type Session,
} from "./core/experiment";
import { aiResultSchema, type AIEvent, type AIResult } from "./core/ai";
import {
  readLocal,
  writeLocal,
  clearLocal,
  download,
  fileJSON,
  importSessions,
} from "./core/store";
import { ArgumentPanel, StructuredEditor } from "./components/ArgumentPanel";
import FidelityPage from "./pages/FidelityPage";
import RaterPage from "./pages/RaterPage";
import "./lab.css";
const bank = rawProblems.map((p) => problemSchema.parse(p));
const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
type Store = {
  sessions: Session[];
  activeId: string | null;
  drafts: Record<string, Action>;
};
const empty = (): Store => ({ sessions: [], activeId: null, drafts: {} });
const links = [
  ["lab", "Overview"],
  ["lab/demo", "Compare & try"],
  ["lab/experiment", "Experiment rehearsal"],
  ["lab/history", "Session history"],
  ["lab/raters", "Blind scoring"],
  ["lab/fidelity", "Fidelity review"],
  ["lab/methods", "Methods"],
  ["lab/research", "Research design"],
  ["lab/privacy", "Privacy"],
];
export default function LabApp({ route }: { route: string }) {
  const [store, setStore] = useState<Store>(empty),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [problemId, setProblemId] = useState(bank[0].id),
    [method, setMethod] = useState<Method>("cartesian"),
    [implementation, setImplementation] = useState<"deterministic" | "llm">(
      "deterministic",
    ),
    [consent, setConsent] = useState(false),
    [ack, setAck] = useState(false),
    [delayed, setDelayed] = useState(false),
    [busy, setBusy] = useState(false),
    [compareAction, setCompareAction] = useState<Action>(blankAction),
    [compareStage, setCompareStage] = useState(0),
    [comparison, setComparison] = useState<Partial<Record<Method, AIResult>>>(
      {},
    );
  const main = useRef<HTMLElement>(null),
    queue = useRef(Promise.resolve());
  useEffect(() => {
    readLocal<Store>("sessions")
      .then((data) => {
        if (data) {
          const sessions = importSessions(data.sessions, bank);
          const drafts: Record<string, Action> = {};
          for (const session of sessions) {
            const c = cursor(session);
            if (c && data.drafts?.[session.id])
              drafts[session.id] = validateAction(
                bank.find((p) => p.id === c.task.id)!,
                data.drafts[session.id],
              );
          }
          setStore({
            sessions,
            drafts,
            activeId: sessions.some((s) => s.id === data.activeId)
              ? data.activeId
              : null,
          });
        }
        setReady(true);
      })
      .catch(() => {
        setNotice(
          "Saved Lab data could not be read. Export recovery files before replacing this journal.",
        );
        setReady(true);
      });
  }, []);
  useEffect(() => {
    main.current?.focus();
  }, [route]);
  const update = (next: Store) => {
    setStore(next);
    queue.current = queue.current
      .then(() => writeLocal("sessions", next))
      .catch(() =>
        setNotice("Local save failed. Export your sessions before leaving."),
      );
  };
  const selected = bank.find((p) => p.id === problemId)!,
    active = store.sessions.find((s) => s.id === store.activeId),
    position = active ? cursor(active) : null,
    problem = position
      ? bank.find((p) => p.id === position.task.id)
      : undefined,
    action = active ? store.drafts[active.id] || blankAction() : blankAction();
  function start(mode: "demo" | "rehearsal") {
    if (store.sessions.length >= 100) {
      setNotice(
        "Export and clear your Lab journal before starting more than 100 sessions.",
      );
      return;
    }
    if (mode === "rehearsal" && !ack) {
      setNotice("Read and acknowledge the local rehearsal information first.");
      return;
    }
    if (implementation === "llm" && (!endpoint || !consent)) {
      setNotice(
        "AI needs a configured endpoint and separate processing consent.",
      );
      return;
    }
    const session = {
      ...createSession(bank, mode, method, selected.id, undefined, delayed),
      implementation,
    };
    update({
      sessions: [...store.sessions, session],
      activeId: session.id,
      drafts: { ...store.drafts, [session.id]: blankAction() },
    });
    setNotice(
      "Session created locally. No research enrollment or submission occurred.",
    );
  }
  const setAction = (a: Action) => {
    if (active)
      update({ ...store, drafts: { ...store.drafts, [active.id]: a } });
  };
  async function callAI(
    m: Method,
    p: Problem,
    stage: number,
    a: Action,
    history: { response: string; question: string }[],
  ) {
    if (!endpoint || !consent) throw Error("AI is not configured or consented");
    const res = await fetch(endpoint + "/lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: m,
        problemId: p.id,
        stage,
        action: a,
        history,
        consent: true,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok)
      throw Error(
        `Optional AI unavailable (${res.status}); no deterministic substitute was recorded.`,
      );
    const value = aiResultSchema.parse(await res.json());
    if (value.condition !== m) throw Error("Condition mismatch");
    return value;
  }
  async function getQuestion() {
    if (!active || !problem || !position) return;
    setBusy(true);
    const began = Date.now();
    const previous = active.records.filter((r) => r.itemId === problem.id),
      a = previous.at(-1)?.action || blankAction();
    let result: AIResult | null = null,
      error: string | null = null;
    try {
      result = await callAI(
        active.method,
        problem,
        position.turn,
        a,
        previous.map((r) => ({
          response: r.action.response,
          question: r.generatedQuestion,
        })),
      );
      const first = active.aiEvents.find((e) => e.result && !e.error)?.result;
      if (
        first &&
        (first.model !== result.model ||
          JSON.stringify(first.parameters) !==
            JSON.stringify(result.parameters) ||
          first.protocolVersion !== result.protocolVersion)
      )
        throw Error(
          "Provider configuration changed within the session. Stop and start a newly versioned session.",
        );
    } catch (e) {
      error = e instanceof Error ? e.message : "AI error";
      setNotice(error);
    }
    const event: AIEvent = {
      itemId: problem.id,
      turn: position.turn,
      inputQuestion: problem.question,
      participantResponse: a.response,
      result,
      error,
      timestamp: new Date().toISOString(),
      condition: active.method,
      latencyMs: Date.now() - began,
    };
    update({
      ...store,
      sessions: store.sessions.map((s) =>
        s.id === active.id ? { ...s, aiEvents: [...s.aiEvents, event] } : s,
      ),
    });
    setBusy(false);
  }
  async function compareAI() {
    setBusy(true);
    setComparison({});
    const values: Partial<Record<Method, AIResult>> = {};
    const events: AIEvent[] = [];
    try {
      for (const m of methods) {
        const began = Date.now();
        try {
          const result = await callAI(m, selected, 0, compareAction, []);
          values[m] = result;
          events.push({
            itemId: selected.id,
            turn: 0,
            inputQuestion: selected.question,
            participantResponse: compareAction.response,
            result,
            error: null,
            timestamp: new Date().toISOString(),
            condition: m,
            latencyMs: Date.now() - began,
          });
        } catch (e) {
          events.push({
            itemId: selected.id,
            turn: 0,
            inputQuestion: selected.question,
            participantResponse: compareAction.response,
            result: null,
            error: String(e),
            timestamp: new Date().toISOString(),
            condition: m,
            latencyMs: Date.now() - began,
          });
          throw e;
        }
      }
      if (new Set(Object.values(values).map((v) => v!.model)).size !== 1)
        throw Error("Models differ; comparison rejected.");
      setComparison(values);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Comparison unavailable");
    }
    await writeLocal("lastComparison", {
      version: "1.0",
      problem: selected,
      action: compareAction,
      events,
    });
    setBusy(false);
  }
  const path = route.split("/")[1] || "overview";
  const mode = path === "experiment" ? "rehearsal" : "demo";
  const inSession =
    active && active.mode === mode && ["demo", "experiment"].includes(path);
  const c = position,
    previous =
      active?.records.filter((r) => r.itemId === problem?.id).at(-1)?.action ||
      blankAction();
  const deterministicQuestion =
    problem && c
      ? runEngine(problem, active!.method, previous, c.turn).question
      : "";
  const aiEvent = active?.aiEvents
    .filter(
      (e) =>
        e.itemId === problem?.id && e.turn === c?.turn && e.result && !e.error,
    )
    .at(-1);
  const isIntervention = c?.task.phase === "intervention";
  const generated = isIntervention
    ? active?.implementation === "llm"
      ? aiEvent?.result?.question || ""
      : deterministicQuestion
    : "";
  const processing = (
    <details>
      <summary>Optional AI processing</summary>
      <p>
        {endpoint
          ? "An optional endpoint is configured."
          : "No AI endpoint is connected."}{" "}
        Only requests you initiate send the current structured problem,
        responses and dialogue to the service and OpenAI. No Lab data is
        enrolled in research. API keys stay on the server. Do not include
        personal information.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Allow these explicit AI requests to process my responses externally.
      </label>
    </details>
  );
  return (
    <>
      <a
        className="skip"
        href="#lab-main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to Lab content
      </a>
      <SiteHeader />
      <div className="lab-shell">
        <nav className="lab-nav" aria-label="Reasoning Lab navigation">
          {links.map(([url, label]) => (
            <a
              key={url}
              href={"#" + url}
              aria-current={route === url ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <main id="lab-main" ref={main} tabIndex={-1}>
          {notice && (
            <p className="notice" role="status">
              {notice}
              <button
                className="quiet"
                aria-label="Dismiss Lab notice"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </p>
          )}
          {!ready ? (
            <p>Reading the local Lab journal…</p>
          ) : (
            <>
              {path === "overview" && (
                <>
                  <section className="lab-hero">
                    <p className="eyebrow">PHILOSOPHICAL REASONING LAB</p>
                    <h1>How should we examine an argument?</h1>
                    <p className="lead">
                      Try the same problem with Descartes’ doubt, Socratic
                      questioning, or Dewey’s inquiry. Compare the questions
                      each method asks and the reasons it leaves standing.
                    </p>
                    <a className="button" href="#lab/demo">
                      Compare the methods →
                    </a>
                    <a className="button secondary" href="#learn">
                      Read the philosophy
                    </a>
                  </section>
                  <div className="lab-card-grid">
                    {methods.map((m) => (
                      <article className="card" key={m}>
                        <h2>{protocols[m].name}</h2>
                        <p>
                          {
                            {
                              cartesian:
                                "Which beliefs survive a careful examination of their foundations? Trace what an argument depends on, and distinguish a reason for doubt from a proof that something is false.",
                              socratic:
                                "What do you mean, and do your commitments fit together? Examine a definition against a counterexample, then decide what needs to change.",
                              pragmatist:
                                "What would resolve the problem? Propose an explanation, work out what follows from it, and identify the evidence needed to test it.",
                              neutral:
                                "Clarify the claim and discuss its reasons without following one of the three method-specific procedures. This provides a comparison condition.",
                            }[m]
                          }
                        </p>
                        <a href="#lab/methods">Method and limitations →</a>
                      </article>
                    ))}
                  </div>
                  <section className="lab-reading">
                    <h2>What you can try here</h2>
                    <p>
                      The rule engines operate on declared propositions and
                      dependencies. They cannot understand arbitrary prose.
                      Language models are a separate optional implementation,
                      with the same model and parameter settings across all four
                      conditions.
                    </p>
                    <p>
                      The demonstration is available without credentials.
                      Research enrollment is closed. Rehearsal, outcome scoring
                      and method fidelity are separate workflows.
                    </p>
                    <a href="#lab/research">Read the experimental design →</a>
                  </section>
                </>
              )}
              {["demo", "experiment"].includes(path) && (
                <section className="lab-workspace">
                  <h1>
                    {mode === "demo" ? "Compare & try" : "Experiment rehearsal"}
                  </h1>
                  {mode === "rehearsal" ? (
                    <>
                      <p>
                        This is a local rehearsal of a controlled protocol, not
                        a live study. It assigns a method without displaying its
                        label during the session. Source inspection can reveal
                        it. No participants are being recruited and no records
                        are sent to a research server.
                      </p>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={ack}
                          onChange={(e) => setAck(e.target.checked)}
                        />
                        I understand this is local rehearsal, not research
                        enrollment.
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={delayed}
                          onChange={(e) => setDelayed(e.target.checked)}
                        />
                        Include a follow-up available after seven days.
                      </label>
                      <p>
                        Six pre-assessment items → three intervention items with
                        four turns each → six post-assessment items. Assessment
                        and intervention pools never overlap. Fixed forms are
                        not yet equated.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Choose the same structured problem for each method. All
                        displayed findings are relative to the supplied
                        encoding, not a judgment of your intelligence or the
                        truth of a philosophy.
                      </p>
                      <label>
                        Philosophical problem
                        <select
                          value={problemId}
                          onChange={(e) => {
                            setProblemId(e.target.value);
                            setCompareAction(blankAction());
                            setComparison({});
                          }}
                        >
                          {bank
                            .filter((p) => p.pool === "intervention")
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.domain} · {p.title}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Dialogue method
                        <select
                          value={method}
                          onChange={(e) => setMethod(e.target.value as Method)}
                        >
                          {methods.map((m) => (
                            <option key={m} value={m}>
                              {protocols[m].name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Implementation
                    <select
                      value={implementation}
                      onChange={(e) =>
                        setImplementation(
                          e.target.value as "deterministic" | "llm",
                        )
                      }
                    >
                      <option value="deterministic">
                        Deterministic structured rules
                      </option>
                      <option value="llm" disabled={!endpoint}>
                        Common-model AI {endpoint ? "" : "— not configured"}
                      </option>
                    </select>
                  </label>
                  {processing}
                  <button onClick={() => start(mode)} disabled={busy}>
                    Start{" "}
                    {mode === "demo" ? "demonstration" : "local rehearsal"}
                  </button>
                  {mode === "demo" && (
                    <details className="lab-comparison">
                      <summary>Side-by-side comparison on shared input</summary>
                      <p>{selected.question}</p>
                      <label>
                        Shared participant statement
                        <textarea
                          maxLength={4000}
                          value={compareAction.response}
                          onChange={(e) =>
                            setCompareAction({
                              ...compareAction,
                              response: e.target.value,
                            })
                          }
                        />
                      </label>
                      <StructuredEditor
                        problem={selected}
                        action={compareAction}
                        onChange={setCompareAction}
                      />
                      <label>
                        Protocol stage
                        <select
                          value={compareStage}
                          onChange={(e) =>
                            setCompareStage(Number(e.target.value))
                          }
                        >
                          {[0, 1, 2, 3].map((i) => (
                            <option key={i} value={i}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="lab-card-grid">
                        {methods.map((m) => {
                          const t = runEngine(
                            selected,
                            m,
                            compareAction,
                            compareStage,
                          );
                          return (
                            <article className="card" key={m}>
                              <h3>{protocols[m].name}</h3>
                              <p>{t.question}</p>
                              <details>
                                <summary>Inspect rule trace</summary>
                                <pre>{JSON.stringify(t, null, 2)}</pre>
                              </details>
                              {comparison[m] && (
                                <>
                                  <p>
                                    <b>AI, stage 1:</b>{" "}
                                    {comparison[m]!.question}
                                  </p>
                                  <small>
                                    {comparison[m]!.model} ·{" "}
                                    {comparison[m]!.promptVersion}
                                  </small>
                                </>
                              )}
                            </article>
                          );
                        })}
                      </div>
                      <button
                        disabled={!endpoint || !consent || busy}
                        onClick={compareAI}
                      >
                        Request four AI comparisons at stage 1
                      </button>
                      <button
                        className="secondary"
                        onClick={async () => {
                          const log = await readLocal("lastComparison");
                          if (log) download("lab-ai-comparison.json", log);
                          else
                            setNotice(
                              "No AI comparison has been run on this device.",
                            );
                        }}
                      >
                        Export latest AI comparison log
                      </button>
                      <p>
                        AI comparison always uses a fresh first turn. A failed
                        request is reported, never replaced with simulated AI.
                      </p>
                    </details>
                  )}
                  {inSession &&
                    (problem && c ? (
                      <section className="lab-dialogue">
                        <p className="eyebrow">
                          {active.mode === "rehearsal"
                            ? "CONDITION LABEL CONCEALED"
                            : protocols[active.method].name}{" "}
                          · {active.implementation}
                        </p>
                        <h2>{problem.title}</h2>
                        <p>
                          Task {c.index + 1} of {active.schedule.length} ·{" "}
                          {c.task.phase}{" "}
                          {isIntervention
                            ? `· turn ${c.turn + 1} / ${config.turns}`
                            : ""}
                        </p>
                        <p className="prompt">{problem.question}</p>
                        {c.task.phase === "delayed" &&
                        active.delayedDueAt &&
                        Date.now() < Date.parse(active.delayedDueAt) ? (
                          <p>
                            Follow-up opens{" "}
                            {new Date(active.delayedDueAt).toLocaleString()}.
                            Return through Session history.
                          </p>
                        ) : (
                          <>
                            {isIntervention && (
                              <div className="lab-stimulus">
                                {active.implementation === "llm" &&
                                !generated ? (
                                  <>
                                    <p>
                                      Generate the next protocol question before
                                      responding. Provider failures do not
                                      consume a dialogue turn.
                                    </p>
                                    <button
                                      disabled={busy || !consent || !endpoint}
                                      onClick={getQuestion}
                                    >
                                      {busy
                                        ? "Requesting…"
                                        : "Generate AI question"}
                                    </button>
                                  </>
                                ) : (
                                  <p>{generated}</p>
                                )}
                              </div>
                            )}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                try {
                                  const next = append(
                                    active,
                                    bank,
                                    action,
                                    generated,
                                  );
                                  const nextCursor = cursor(next);
                                  const draft =
                                    nextCursor?.task.id === problem.id
                                      ? {
                                          ...action,
                                          response: "",
                                          revisionNote: "",
                                        }
                                      : blankAction();
                                  update({
                                    ...store,
                                    sessions: store.sessions.map((s) =>
                                      s.id === next.id ? next : s,
                                    ),
                                    drafts: {
                                      ...store.drafts,
                                      [next.id]: draft,
                                    },
                                  });
                                  setNotice(
                                    next.status === "completed"
                                      ? "Session completed locally. Export it from history."
                                      : "Response recorded.",
                                  );
                                  main.current?.focus();
                                } catch (e) {
                                  setNotice(
                                    e instanceof Error
                                      ? e.message
                                      : "Could not record response",
                                  );
                                }
                              }}
                            >
                              <fieldset disabled={busy}>
                                <legend className="sr-only">
                                  Participant response
                                </legend>
                                <label>
                                  {isIntervention
                                    ? "Your dialogue response"
                                    : "Your independent assessment response"}
                                  <textarea
                                    maxLength={4000}
                                    value={action.response}
                                    onChange={(e) =>
                                      setAction({
                                        ...action,
                                        response: e.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <p className="small">
                                  You may decline, challenge a premise, retain a
                                  view or suspend judgment. Blank responses are
                                  recorded as missing, not scored zero.
                                </p>
                                {isIntervention && (
                                  <StructuredEditor
                                    problem={problem}
                                    action={action}
                                    onChange={setAction}
                                  />
                                )}
                                <button
                                  disabled={
                                    busy ||
                                    (isIntervention &&
                                      active.implementation === "llm" &&
                                      !generated)
                                  }
                                >
                                  Record response & continue
                                </button>
                              </fieldset>
                            </form>
                            {mode === "demo" && (
                              <ArgumentPanel
                                problem={problem}
                                trace={runEngine(
                                  problem,
                                  active.method,
                                  action,
                                  c.turn,
                                  previous,
                                )}
                              />
                            )}
                          </>
                        )}
                      </section>
                    ) : (
                      <section className="lab-stimulus">
                        <h2>Session complete</h2>
                        <p>
                          {active.records.length} records saved. No quality
                          score was inferred.
                        </p>
                        <a href="#lab/history">
                          Inspect and export this session →
                        </a>
                      </section>
                    ))}
                </section>
              )}
              {path === "history" && (
                <section className="lab-reading">
                  <h1>Lab session history</h1>
                  <p>
                    Lab records are separate from your Depth Map journal and XP.
                    Full exports contain private prose and condition labels.
                    Blind packets contain only assessment responses; keep the
                    matching key away from raters.
                  </p>
                  <button
                    onClick={() =>
                      download("lab-sessions.json", store.sessions)
                    }
                  >
                    Export all Lab sessions
                  </button>
                  <label>
                    Import session logs
                    <input
                      type="file"
                      accept=".json"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          const imported = importSessions(
                            await fileJSON(f),
                            bank,
                          );
                          const merged = [
                            ...store.sessions.filter(
                              (s) => !imported.some((x) => x.id === s.id),
                            ),
                            ...imported,
                          ];
                          if (merged.length > 100)
                            throw Error("Too many sessions");
                          update({ ...store, sessions: merged });
                          setNotice(
                            "Sessions imported and deterministic traces replay-checked.",
                          );
                        } catch (e) {
                          setNotice(
                            e instanceof Error
                              ? e.message
                              : "Invalid session file",
                          );
                        }
                      }}
                    />
                  </label>
                  <button
                    className="secondary"
                    disabled={
                      !store.sessions.some((s) =>
                        s.records.some((r) => r.phase !== "intervention"),
                      )
                    }
                    onClick={() => {
                      const output = blindExport(
                        store.sessions,
                        bank,
                        20261011,
                      );
                      download("lab-blind-packet.json", output.packet);
                      writeLocal("last-blind-key", output.mapping).catch(() =>
                        setNotice("Save of coordinator key failed."),
                      );
                      setNotice(
                        "Blind packet exported. Download the separate key only for the authorized coordinator.",
                      );
                    }}
                  >
                    Export blind assessment packet
                  </button>
                  <button
                    className="quiet"
                    onClick={async () => {
                      const key = await readLocal("last-blind-key");
                      if (key)
                        download("lab-coordinator-key-PRIVATE.json", key);
                      else setNotice("Create a blind packet first.");
                    }}
                  >
                    Download private matching key
                  </button>
                  {store.sessions.length === 0 && (
                    <p>
                      No Lab sessions yet. <a href="#lab/demo">Try a method.</a>
                    </p>
                  )}
                  {store.sessions.map((s) => (
                    <details key={s.id}>
                      <summary>
                        {s.mode} · {s.status} · {s.records.length} records ·{" "}
                        {s.id.slice(0, 8)}
                      </summary>
                      <p>
                        {s.synthetic ? "SYNTHETIC fixture · " : ""}
                        {protocols[s.method].name} · {s.implementation} · config{" "}
                        {s.configId}
                      </p>
                      <button
                        className="secondary"
                        onClick={() => {
                          update({ ...store, activeId: s.id });
                          location.hash =
                            s.mode === "demo" ? "lab/demo" : "lab/experiment";
                        }}
                      >
                        Open session
                      </button>
                      <button
                        className="quiet"
                        onClick={() => download(`lab-${s.id}.json`, [s])}
                      >
                        Export session trace
                      </button>
                      <button
                        className="quiet"
                        onClick={() => {
                          try {
                            validateSession(s, bank);
                            const result = replay(s, bank);
                            setNotice(
                              `${result.length} deterministic trace records replayed; ${result.filter((r) => r.matches).length} match. LLM text is replayed from logs, not regenerated.`,
                            );
                          } catch {
                            setNotice(
                              "Replay mismatch; preserve the export for investigation.",
                            );
                          }
                        }}
                      >
                        Verify replay
                      </button>
                      <details>
                        <summary>Replay dialogue transcript</summary>
                        <ol>
                          {s.records.map((r) => (
                            <li key={r.id}>
                              <h3>
                                {bank.find((p) => p.id === r.itemId)?.title} ·{" "}
                                {r.phase} · turn {r.turn + 1}
                              </h3>
                              <p>
                                {r.generatedQuestion ||
                                  bank.find((p) => p.id === r.itemId)?.question}
                              </p>
                              <blockquote>
                                {r.action.response ||
                                  "No written response recorded."}
                              </blockquote>
                              {r.action.revisionNote && (
                                <p>
                                  Revision or retention: {r.action.revisionNote}
                                </p>
                              )}
                              <small>{r.timestamp}</small>
                            </li>
                          ))}
                        </ol>
                      </details>
                      <details>
                        <summary>Read saved responses and traces</summary>
                        <pre>{JSON.stringify(s, null, 2)}</pre>
                      </details>
                    </details>
                  ))}
                </section>
              )}
              {path === "raters" && <RaterPage />}
              {path === "fidelity" && <FidelityPage bank={bank} />}
              {path === "methods" && (
                <article className="lab-reading">
                  <h1>Four procedures, limited interpretations</h1>
                  <p>
                    These are explicit computational reconstructions, not
                    replicas of historical philosophers or unrestricted
                    philosophical intelligence.
                  </p>
                  {methods.map((m) => (
                    <section key={m}>
                      <h2>{protocols[m].name}</h2>
                      <p>{protocols[m].instruction}</p>
                      <ol>
                        {protocols[m].stages.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </section>
                  ))}
                  <p>
                    Cartesian doubt does not mean denying every proposition. An
                    elenchus can expose inconsistent commitments without proving
                    which is false. Deweyan inquiry concerns the transformation
                    of a problematic situation; counting useful consequences is
                    not its success criterion. Neutral dialogue controls some
                    attention and clarification, but is not a philosophically
                    empty condition.
                  </p>
                  <a href="#learn">
                    Primary texts and scholarly introductions →
                  </a>
                </article>
              )}
              {path === "research" && (
                <article className="lab-reading">
                  <h1>Research design and evaluation</h1>
                  <p className="status-label">
                    Software implementation · no efficacy or validation findings
                  </p>
                  <p>
                    Compare four protocols within each implementation.
                    Deterministic rules and pretrained models differ in many
                    ways; a comparison cannot isolate philosophy alone without
                    additional controls.
                  </p>
                  <h2>Allocation and budgets</h2>
                  <p>
                    Seeded assignment is reproducible from configuration and
                    pseudonymous participant ID. Each intervention has four
                    turns and a 4,000-character response cap. Fixed pre/post
                    forms cover six domains; delayed follow-up is optional after
                    seven days. Question order and intervention sampling are
                    seeded. All LLM conditions use one server-configured model,
                    temperature 1 and a shared output ceiling.
                  </p>
                  <h2>Independent outcome ratings</h2>
                  <p>
                    Blind human raters assess reconstruction, assumptions,
                    consistency, objections, justification, uncertainty,
                    integration and relevance. Missing evidence remains NA.
                    Fidelity is a separate condition-aware review. Response
                    quality, inquiry transitions and personal proficiency remain
                    different inferences.
                  </p>
                  <h2>What can still confound a comparison?</h2>
                  <p>
                    Unequated assessment forms, method-appropriate task
                    affordances, educational familiarity, language, demand
                    characteristics, differential engagement, contamination from
                    prior demonstrations and imperfect rater blinding. Public
                    source inspection can expose assignments. No number of
                    doubts, questions, consequences or revisions counts as
                    general reasoning quality.
                  </p>
                  <p>
                    Preregister outcomes, sampling, power simulations,
                    missingness, clustering and exclusions before collecting
                    data. See the source repository for the literature review,
                    schema, scripts and review gates.
                  </p>
                  <a
                    href="https://github.com/RRG314/philosophical-depth-map/tree/main/lab/research"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Research documentation ↗
                  </a>
                </article>
              )}
              {path === "privacy" && (
                <article className="lab-reading">
                  <h1>Lab privacy and consent</h1>
                  <p>
                    The public Lab stores sessions and human scoring work only
                    in this browser's separate IndexedDB database. It has no
                    accounts, analytics or enabled research submission. Use one
                    tab at a time. Browser storage can be cleared or evicted.
                  </p>
                  <p>
                    Exports contain your words and can identify you. Do not
                    include names or private information. Blind export removes
                    explicit metadata but cannot guarantee that prose is
                    anonymous. Never share the coordinator matching key with
                    outcome raters.
                  </p>
                  {processing}
                  <p>
                    Research collection requires a responsible investigator,
                    institutional determination, approved consent, an
                    authenticated deployment and working withdrawal/retention
                    controls. Public rehearsal does not provide that consent.
                  </p>
                  <button
                    className="danger"
                    onClick={async () => {
                      if (
                        confirm(
                          "Delete all local Reasoning Lab sessions, drafts, ratings and matching keys? Depth Map data and downloaded files remain.",
                        )
                      ) {
                        await queue.current;
                        await clearLocal();
                        setStore(empty());
                        setConsent(false);
                        setNotice(
                          "Local Lab records deleted. Downloaded files are not deleted.",
                        );
                      }
                    }}
                  >
                    Delete all local Lab data
                  </button>
                  <a className="block-link" href="#privacy">
                    Depth Map privacy →
                  </a>
                </article>
              )}
              {![
                "overview",
                "demo",
                "experiment",
                "history",
                "raters",
                "fidelity",
                "methods",
                "research",
                "privacy",
              ].includes(path) && (
                <article className="lab-reading">
                  <h1>Lab page not found</h1>
                  <a href="#lab">Return to the Lab</a>
                </article>
              )}
            </>
          )}
        </main>
        <footer className="lab-footer">
          <p>
            Philosophical Reasoning Lab · inspect the method, examine the
            inference.
          </p>
          <a href="#home">Depth Map</a> · <a href="#learn">Learning library</a>{" "}
          · <a href="#lab/privacy">Lab privacy</a>
        </footer>
      </div>
    </>
  );
}
