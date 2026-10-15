import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { act, database, explain } from "./firebase";
import { useSession, download } from "./hooks";
import type { Experiment } from "./types";
type Draft = {
  initial: string;
  final: string;
  stage: 0 | 1 | 2;
  requestId: string;
  submitted: boolean;
  priorExposure: boolean;
};
export default function ExperimentPage({
  experiment: e,
}: {
  experiment: Experiment;
}) {
  const session = useSession();
  const key = `experiment-draft:${e.slug}:${e.version}`;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || "null");
      if (
        value &&
        typeof value.initial === "string" &&
        typeof value.final === "string" &&
        [0, 1, 2].includes(value.stage)
      )
        return value;
    } catch {
      /* Storage may be unavailable. */
    }
    return {
      initial: "",
      final: "",
      stage: 0,
      requestId: crypto.randomUUID(),
      submitted: false,
      priorExposure: false,
    };
  });
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [collection, setCollection] = useState({ enabled: false, contact: "" });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* Download remains available. */
    }
  }, [draft, key]);
  useEffect(() => {
    if (!database) return;
    return onSnapshot(
      doc(database, "settings", "public"),
      (snap) => {
        const value = snap.data();
        setCollection({
          enabled: !!value?.collectionEnabled,
          contact: value?.privacyContact || "",
        });
      },
      () => setCollection({ enabled: false, contact: "" }),
    );
  }, []);
  return (
    <article className="community-reading experiment-reading">
      <a href="#experiments">← Thought experiments</a>
      <p className="eyebrow">
        {e.kind === "original"
          ? "ORIGINAL THOUGHT EXPERIMENT"
          : e.kind === "community"
            ? "FROM THE COMMUNITY"
            : "FROM PHILOSOPHY"}
      </p>
      <h1>{e.title}</h1>
      <p className="experiment-subtitle">{e.subtitle}</p>
      <p className="experiment-byline">{e.author}</p>
      <div className="preserve-lines experiment-scenario">{e.scenario}</div>
      <hr />
      {draft.stage === 0 ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setDraft({ ...draft, stage: e.reveal ? 1 : 2 });
          }}
        >
          <h2>Consider the question</h2>
          <p className="preserve-lines">{e.question}</p>
          <label>
            Your initial response
            <textarea
              required
              maxLength={10000}
              rows={7}
              value={draft.initial}
              onChange={(ev) =>
                setDraft({ ...draft, initial: ev.target.value })
              }
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.priorExposure}
              onChange={(ev) =>
                setDraft({ ...draft, priorExposure: ev.target.checked })
              }
            />
            I have encountered this experiment before.
          </label>
          <p className="small">
            This draft stays in this browser tab. Nothing is sent unless you
            choose to submit it.
          </p>
          <button>
            {e.reveal
              ? "Record my response and continue"
              : "Finish my response"}
          </button>
        </form>
      ) : (
        <>
          <details>
            <summary>Your initial response</summary>
            <p className="preserve-lines">{draft.initial}</p>
          </details>
          {draft.stage === 1 ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setDraft({ ...draft, stage: 2 });
              }}
            >
              <h2>A further condition</h2>
              <p className="preserve-lines experiment-reveal">{e.reveal}</p>
              <p>{e.finalQuestion}</p>
              <label>
                Your response to this condition
                <textarea
                  required
                  maxLength={10000}
                  rows={7}
                  value={draft.final}
                  onChange={(ev) =>
                    setDraft({ ...draft, final: ev.target.value })
                  }
                />
              </label>
              <button>Finish my response</button>
            </form>
          ) : (
            <>
              <h2>Your response</h2>
              {e.reveal && (
                <>
                  <p className="preserve-lines">{e.reveal}</p>
                  <p className="preserve-lines">{draft.final}</p>
                </>
              )}
              <div className="community-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    download(
                      {
                        experiment: e,
                        initial: draft.initial,
                        final: draft.final,
                        priorExposure: draft.priorExposure,
                      },
                      `${e.slug}-my-response.json`,
                    )
                  }
                >
                  Download my response
                </button>
                <button
                  className="quiet"
                  onClick={() => {
                    if (
                      confirm(
                        "Clear the draft in this tab? Any submitted answer remains in your account until withdrawn.",
                      )
                    )
                      setDraft({
                        initial: "",
                        final: "",
                        stage: 0,
                        requestId: crypto.randomUUID(),
                        submitted: false,
                        priorExposure: true,
                      });
                  }}
                >
                  Clear this draft
                </button>
              </div>
              {draft.submitted ? (
                <p role="status">
                  Your answers were submitted privately. You can download or
                  withdraw them from <a href="#account">your account</a>.
                </p>
              ) : collection.enabled && collection.contact ? (
                <section className="answer-consent">
                  <h3>Share your answers privately</h3>
                  <p>
                    If you submit, the site owner can read and export both
                    answers, the scenario version, submission date, your account
                    identifier and whether you have encountered the experiment
                    before. They will not appear in the public discussion.
                    Answers are retained for up to 365 days; you can withdraw
                    them from your account. Participation is optional.
                  </p>
                  <p>
                    <a href="#community/privacy">Privacy details</a> · Contact:{" "}
                    {collection.contact}
                  </p>
                  {!session.user?.emailVerified ? (
                    <p>
                      <a href="#account">Sign in and verify your email</a> to
                      submit. Your draft remains in this tab.
                    </p>
                  ) : (
                    <>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(ev) => setConsent(ev.target.checked)}
                        />
                        I agree to share these answers privately with the site
                        owner under this notice.
                      </label>
                      <button
                        disabled={!consent || busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await act("submitResponse", {
                              experimentId: e.slug,
                              version: e.version,
                              initial: draft.initial,
                              final: draft.final,
                              consent: "answers-1",
                              priorExposure: draft.priorExposure,
                              requestId: draft.requestId,
                            });
                            setDraft({ ...draft, submitted: true });
                            setMessage("");
                          } catch (error) {
                            setMessage(explain(error));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Submit private answers
                      </button>
                    </>
                  )}
                </section>
              ) : (
                <p>
                  Private answer collection is not open. You can keep a copy
                  using “Download my response.”
                </p>
              )}
              {message && <p role="alert">{message}</p>}
              <details className="experiment-context">
                <summary>Philosophical context and sources</summary>
                <p className="preserve-lines">{e.context}</p>
                <ul>
                  {e.references.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
              <a className="button" href={`#community/${e.slug}`}>
                Join the discussion
              </a>
              <p className="small">
                Opening discussion does not publish your private answer.
              </p>
            </>
          )}
        </>
      )}
    </article>
  );
}
