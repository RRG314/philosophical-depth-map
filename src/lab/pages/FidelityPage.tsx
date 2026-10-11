import { useState } from "react";
import { fidelity } from "../core/evaluation";
import {
  fileJSON,
  importSessions,
  download,
  writeLocal,
  readLocal,
} from "../core/store";
import { type Session } from "../core/experiment";
import { type Problem } from "../core/schema";
export default function FidelityPage({ bank }: { bank: Problem[] }) {
  const [sessions, setSessions] = useState<Session[]>([]),
    [rater, setRater] = useState(""),
    [notice, setNotice] = useState("");
  const [checks, setChecks] = useState<
    Record<string, { value: string; evidence: string }>
  >({});
  return (
    <article className="lab-reading">
      <h1>Method fidelity review</h1>
      <p>
        Condition-aware process review. Complete and lock blind outcome ratings
        before opening these logs. These checks never enter a reasoning-quality
        score.
      </p>
      <label>
        Reviewer alias
        <input
          value={rater}
          onChange={(e) => setRater(e.target.value)}
          maxLength={80}
        />
      </label>
      <label>
        Import session log
        <input
          type="file"
          accept=".json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              const raw = await fileJSON(f);
              setSessions(
                importSessions(Array.isArray(raw) ? raw : [raw], bank),
              );
              setChecks((await readLocal("fidelity")) || {});
              setNotice("Loaded session logs.");
            } catch (e) {
              setNotice(String(e));
            }
          }}
        />
      </label>
      {sessions.map((s) => (
        <section key={s.id}>
          <h2>
            {s.method} · {s.implementation}
          </h2>
          {s.records
            .filter((r) => r.phase === "intervention")
            .map((r) => (
              <details key={r.id}>
                <summary>
                  {r.itemId} · turn {r.turn + 1}
                </summary>
                <blockquote>
                  {r.generatedQuestion || "No displayed question recorded"}
                </blockquote>
                <p>{r.action.response}</p>
                {fidelity[s.method].map((check, i) => {
                  const key = `${rater}:${s.id}:${r.id}:${i}`,
                    v = checks[key] || { value: "not-observed", evidence: "" };
                  return (
                    <fieldset key={key}>
                      <legend>{check}</legend>
                      <label>
                        Process observation
                        <select
                          value={v.value}
                          onChange={(e) =>
                            setChecks({
                              ...checks,
                              [key]: { ...v, value: e.target.value },
                            })
                          }
                        >
                          <option value="not-observed">
                            Not observed / not applicable
                          </option>
                          <option value="met">Met</option>
                          <option value="not-met">Not met</option>
                        </select>
                      </label>
                      <label>
                        Evidence and rationale
                        <textarea
                          value={v.evidence}
                          onChange={(e) =>
                            setChecks({
                              ...checks,
                              [key]: { ...v, evidence: e.target.value },
                            })
                          }
                          maxLength={2000}
                        />
                      </label>
                    </fieldset>
                  );
                })}
              </details>
            ))}
        </section>
      ))}
      <button
        disabled={!rater.trim() || !sessions.length}
        onClick={async () => {
          if (
            Object.values(checks).some(
              (v) => v.value !== "not-observed" && !v.evidence.trim(),
            )
          ) {
            setNotice("Observed checks require evidence and rationale.");
            return;
          }
          await writeLocal("fidelity", checks);
          download("fidelity-review.json", {
            version: "lab-fidelity-1.0",
            rater,
            checks,
            timestamp: new Date().toISOString(),
          });
          setNotice("Saved locally and exported separate fidelity review.");
        }}
      >
        Save and export fidelity review
      </button>
      <p role="status">{notice}</p>
    </article>
  );
}
