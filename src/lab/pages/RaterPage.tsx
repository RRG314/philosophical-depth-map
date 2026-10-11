import { useEffect, useState } from "react";
import {
  criteria,
  criterionIds,
  validateRating,
  agreement,
  fidelity,
  type Criterion,
  type Rating,
} from "../core/evaluation";
import {
  download,
  fileJSON,
  parsePacket,
  readLocal,
  writeLocal,
  importRatings,
} from "../core/store";
import type { BlindPacket } from "../core/experiment";
export default function RaterPage() {
  const [packet, setPacket] = useState<BlindPacket | null>(null),
    [ratings, setRatings] = useState<Rating[]>([]),
    [index, setIndex] = useState(0),
    [criterion, setCriterion] = useState<Criterion>("reconstruction"),
    [score, setScore] = useState(""),
    [evidence, setEvidence] = useState(""),
    [rationale, setRationale] = useState(""),
    [rater, setRater] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    readLocal<{ packet: BlindPacket; ratings: Rating[] }>("raters")
      .then((data) => {
        if (data) {
          setPacket(parsePacket(data.packet));
          setRatings(importRatings(data.ratings, data.packet));
        }
      })
      .catch(() => setMessage("Stored scoring work could not be read."));
  }, []);
  const response = packet?.responses[index];
  const persist = async (p: BlindPacket, r: Rating[]) => {
    try {
      await writeLocal("raters", { packet: p, ratings: r });
    } catch {
      setMessage("Saving failed. Export your ratings before leaving.");
    }
  };
  const raterIds = [...new Set(ratings.map((r) => r.raterId))];
  return (
    <article className="lab-reading">
      <h1>Blind scoring workspace</h1>
      <p>
        Import a condition-blind assessment packet. The packet omits participant
        IDs, condition, implementation, phase, dialogue questions and timing.
        Free text can still disclose clues; an authorized coordinator must
        screen it before rating.
      </p>
      <p>
        General quality is rated here by independent humans. Agent
        self-assessment is not an outcome. This workspace is local; it does not
        establish that two aliases belong to independent raters.
      </p>
      {message && <p role="status">{message}</p>}
      <label>
        Import blind packet
        <input
          type="file"
          accept=".json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const p = parsePacket(await fileJSON(f));
              if (packet && ratings.length)
                await writeLocal("raters-last-archive", {
                  packet,
                  ratings,
                });
              setPacket(p);
              setRatings([]);
              setIndex(0);
              await persist(p, []);
              setMessage("Packet loaded.");
            } catch {
              setMessage("Invalid blind packet. Nothing imported.");
            }
          }}
        />
      </label>
      <button
        className="quiet"
        onClick={async () => {
          const archive = await readLocal("raters-last-archive");
          if (archive) download("lab-previous-scoring-work.json", archive);
          else setMessage("No previous packet has been archived.");
        }}
      >
        Export previous scoring workspace
      </button>
      {packet && (
        <>
          <p>
            {packet.synthetic
              ? "SYNTHETIC engineering fixture"
              : "User-supplied assessment packet; provenance requires coordinator review"}{" "}
            · {packet.responses.length} responses
          </p>
          <label>
            Rater alias
            <input
              maxLength={80}
              value={rater}
              onChange={(e) => setRater(e.target.value)}
            />
          </label>
          {response && (
            <>
              <label>
                Response
                <select
                  value={index}
                  onChange={(e) => {
                    setIndex(Number(e.target.value));
                    setEvidence("");
                    setRationale("");
                    setScore("");
                  }}
                >
                  {packet.responses.map((r, i) => (
                    <option value={i} key={r.blindId}>
                      Response {i + 1} · {r.blindId.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="lab-stimulus">
                <h2>{response.question}</h2>
                <blockquote>
                  {response.response ||
                    "No written response recorded. Use NA; refusal does not demonstrate inability."}
                </blockquote>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const item = validateRating(
                      {
                        blindId: response.blindId,
                        criterion,
                        score: score === "" ? null : Number(score),
                        evidence,
                        rationale,
                        raterId: rater,
                        rubricVersion: "lab-general-1.0",
                        timestamp: new Date().toISOString(),
                      },
                      response.response,
                    );
                    const next = [
                      ...ratings.filter(
                        (r) =>
                          !(
                            r.blindId === item.blindId &&
                            r.criterion === criterion &&
                            r.raterId === rater
                          ),
                      ),
                      item,
                    ];
                    setRatings(next);
                    await persist(packet, next);
                    setMessage("Human rating saved locally.");
                  } catch {
                    setMessage(
                      "Enter a rater alias and rationale. An observed score also needs an exact excerpt.",
                    );
                  }
                }}
              >
                <label>
                  Criterion
                  <select
                    value={criterion}
                    onChange={(e) => setCriterion(e.target.value as Criterion)}
                  >
                    {criterionIds.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <ol start={0}>
                  {criteria[criterion].map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
                <label>
                  Observed score
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  >
                    <option value="">
                      NA / no opportunity or insufficient evidence
                    </option>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Exact evidence excerpt
                  <textarea
                    maxLength={4000}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </label>
                <label>
                  Rationale or missingness reason
                  <textarea
                    required
                    maxLength={2000}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                  />
                </label>
                <button>Save human rating</button>
              </form>
            </>
          )}
          <button
            className="secondary"
            onClick={() => download("lab-human-ratings.json", ratings)}
          >
            Export ratings
          </button>
          <details>
            <summary>Review saved human ratings ({ratings.length})</summary>
            <ul>
              {ratings.map((r) => (
                <li key={`${r.blindId}:${r.raterId}:${r.criterion}`}>
                  <b>
                    {r.raterId} · {r.criterion} · {r.score ?? "NA"}
                  </b>
                  <blockquote>{r.evidence}</blockquote>
                  <p>{r.rationale}</p>
                  <small>
                    Response {r.blindId} · {r.timestamp}
                  </small>
                </li>
              ))}
            </ul>
          </details>
          <label>
            Merge independent rater file
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const extra = importRatings(await fileJSON(f), packet);
                  const combined = importRatings(
                    [...ratings, ...extra],
                    packet,
                  );
                  setRatings(combined);
                  await persist(packet, combined);
                  setMessage("Independent file merged.");
                } catch {
                  setMessage(
                    "Rating import rejected: incompatible packet, invalid evidence or duplicate rater/dimension.",
                  );
                }
              }}
            />
          </label>
          <h2>Agreement by criterion</h2>
          <p>
            Quadratically weighted kappa, paired observed ratings only. Null
            means insufficient variation or no paired evidence. Small samples
            and correlated items require study-specific uncertainty analysis.
          </p>
          {raterIds.length >= 2 ? (
            <ul>
              {criterionIds.map((c) => {
                const a = agreement(ratings, raterIds[0], raterIds[1], c);
                return (
                  <li key={c}>
                    {c}:{" "}
                    {a.kappa === null ? "Not estimable" : a.kappa.toFixed(3)} ·{" "}
                    {a.paired} pairs ({raterIds[0]} / {raterIds[1]})
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>
              Import ratings from two independent raters to compare agreement.
            </p>
          )}
        </>
      )}
      <details>
        <summary>Separate method fidelity checklist</summary>
        <p>
          Use a separate, condition-aware review after outcome ratings are
          locked. These process checks do not enter the general quality score.
        </p>
        {Object.entries(fidelity).map(([method, items]) => (
          <section key={method}>
            <h3>{method}</h3>
            <ul>
              {items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        ))}
      </details>
    </article>
  );
}
