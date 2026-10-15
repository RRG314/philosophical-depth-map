import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, act, explain } from "./firebase";
import { useSession, usePage, Pager, download, type Filter } from "./hooks";
import type { Experiment, Entry } from "./types";
const blank: Experiment = {
  slug: "",
  title: "",
  subtitle: "",
  author: "",
  kind: "original",
  tags: ["Ethics"],
  scenario: "",
  question: "",
  reveal: "",
  finalQuestion: "",
  context: "",
  references: [],
  featured: false,
  order: 100,
  status: "draft",
  version: 0,
};
export default function Admin({ experiments }: { experiments: Experiment[] }) {
  const session = useSession();
  const [tab, setTab] = useState("posts"),
    [selected, setSelected] = useState<Experiment>(blank),
    [message, setMessage] = useState("");
  const [contact, setContact] = useState(""),
    [enabled, setEnabled] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  useEffect(() => {
    if (!database || !session.admin) return;
    let active = true;
    void getDoc(doc(database, "settings", "public"))
      .then((s) => {
        if (!active) return;
        setContact(s.data()?.privacyContact ?? "");
        setEnabled(s.data()?.collectionEnabled === true);
        setSettingsReady(true);
      })
      .catch((error) => {
        if (active) setMessage(explain(error));
      });
    return () => {
      active = false;
    };
  }, [session.admin]);
  if (!session.ready) return <p>Checking access…</p>;
  if (!session.moderator)
    return (
      <section className="community-reading">
        <h1>Editorial desk</h1>
        <p>
          This area requires an administrator or moderator account.{" "}
          <a href="#account">Sign in</a>.
        </p>
      </section>
    );
  return (
    <section className="community-reading">
      <h1>Editorial desk</h1>
      <nav className="community-subnav" aria-label="Editorial sections">
        {[
          "posts",
          "proposals",
          "reports",
          ...(session.admin ? ["experiments", "responses", "settings"] : []),
        ].map((t) => (
          <button
            className="quiet"
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setMessage("");
            }}
            key={t}
          >
            {t === "responses"
              ? "Private answers"
              : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {message && <p role="status">{message}</p>}
      {tab === "experiments" ? (
        <>
          <label>
            Open an experiment
            <select
              value={selected.slug}
              onChange={async (e) => {
                if (!e.target.value) {
                  setSelected({ ...blank });
                  return;
                }
                try {
                  const snapshot = await getDoc(
                    doc(database!, "experiments", e.target.value),
                  );
                  setSelected(snapshot.data() as Experiment);
                } catch (error) {
                  setMessage(explain(error));
                }
              }}
            >
              <option value="">New experiment</option>
              {experiments.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <Editor
            key={`${selected.slug}-${selected.version}`}
            initial={selected}
            onSaved={(entry) => {
              setSelected(entry);
              setMessage("Experiment saved.");
            }}
          />
          <p>
            Publishing creates an immutable version. Existing answers retain the
            scenario and questions they responded to.
          </p>
        </>
      ) : tab === "settings" ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await act("configure", {
                privacyContact: contact,
                collectionEnabled: enabled,
              });
              setMessage("Collection settings saved.");
            } catch (error) {
              setMessage(explain(error));
            }
          }}
        >
          <h2>Private answer collection</h2>
          {!settingsReady && <p>Loading collection settings…</p>}
          <fieldset disabled={!settingsReady}>
            <label>
              Privacy contact email
              <input
                type="email"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Enable voluntary private answer submission under the published
              privacy notice
            </label>
            <p>
              This is separate from the controlled Reasoning Lab study, which
              remains closed. Review the notice, account deletion, retention
              schedule and your applicable research requirements before enabling
              collection.
            </p>
            <button>Save collection settings</button>
          </fieldset>
        </form>
      ) : (
        <Review
          key={tab}
          kind={tab}
          onFeature={(row) => {
            setSelected({
              ...blank,
              slug: row
                .title!.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, ""),
              title: row.title!,
              scenario: row.scenario!,
              question: row.question!,
              author: row.displayName ?? "Community contributor",
              kind: "community",
              tags: row.tags ?? ["Ethics"],
            });
            setTab("experiments");
          }}
          canFeature={session.admin}
        />
      )}
    </section>
  );
}
function Editor({
  initial,
  onSaved,
}: {
  initial: Experiment;
  onSaved: (e: Experiment) => void;
}) {
  const [e, setE] = useState(initial),
    [references, setReferences] = useState(
      initial.references.map((r) => `${r.title} | ${r.url}`).join("\n"),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const fields: [keyof Experiment, string, boolean][] = [
    ["slug", "URL name", false],
    ["title", "Title", false],
    ["subtitle", "Subtitle", false],
    ["author", "Author attribution", false],
    ["scenario", "Scenario", true],
    ["question", "Initial question", true],
    ["reveal", "Later condition (optional)", true],
    ["finalQuestion", "Question after the later condition", true],
    ["context", "Context shown after responding", true],
  ];
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const refs = references
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              const [title, ...rest] = line.split("|");
              return { title: title.trim(), url: rest.join("|").trim() };
            });
          const version = e.version;
          const data = Object.fromEntries(
            Object.keys(blank)
              .filter((k) => k !== "version")
              .map((k) => [k, e[k as keyof Experiment]]),
          );
          await act("saveExperiment", {
            ...data,
            references: refs,
            expectedVersion: version,
          });
          const saved = await getDoc(doc(database!, "experiments", e.slug));
          onSaved(saved.data() as Experiment);
          setError("Experiment saved.");
        } catch (error) {
          setError(explain(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map(([key, label, multi]) => (
        <label key={key}>
          {label}
          {multi ? (
            <textarea
              rows={key === "scenario" ? 9 : 3}
              required={["scenario", "question"].includes(key)}
              maxLength={
                key === "reveal" ? 5000 : key === "finalQuestion" ? 1000 : 10000
              }
              value={String(e[key])}
              onChange={(ev) => setE({ ...e, [key]: ev.target.value })}
            />
          ) : (
            <input
              required={["slug", "title", "author"].includes(key)}
              disabled={key === "slug" && e.version > 0}
              value={String(e[key])}
              maxLength={key === "slug" ? 128 : key === "subtitle" ? 250 : 160}
              onChange={(ev) => setE({ ...e, [key]: ev.target.value })}
            />
          )}
        </label>
      ))}
      <label>
        Topics, separated by commas
        <input
          required
          value={e.tags.join(", ")}
          onChange={(ev) =>
            setE({
              ...e,
              tags: ev.target.value.split(",").map((t) => t.trim()),
            })
          }
        />
      </label>
      <label>
        Editorial category
        <select
          value={e.kind}
          onChange={(ev) =>
            setE({ ...e, kind: ev.target.value as Experiment["kind"] })
          }
        >
          <option value="original">Original</option>
          <option value="historical">Historical</option>
          <option value="community">Community</option>
        </select>
      </label>
      <label>
        Sources (one “Title | https://address” per line)
        <textarea
          value={references}
          onChange={(ev) => setReferences(ev.target.value)}
        />
      </label>
      <label>
        Publication
        <select
          aria-label="Publication"
          value={e.status}
          onChange={(ev) =>
            setE({ ...e, status: ev.target.value as Experiment["status"] })
          }
        >
          <option value="draft">Draft — private</option>
          <option value="published">Published</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={e.featured}
          onChange={(ev) => setE({ ...e, featured: ev.target.checked })}
        />
        Featured
      </label>
      <label>
        Display order
        <input
          type="number"
          required
          min={0}
          max={10000}
          value={e.order}
          onChange={(ev) => setE({ ...e, order: Number(ev.target.value) })}
        />
      </label>
      <button disabled={busy}>Save experiment</button>
      {error && <p role="status">{error}</p>}
    </form>
  );
}
function Review({
  kind,
  onFeature,
  canFeature,
}: {
  kind: string;
  onFeature: (row: Entry) => void;
  canFeature: boolean;
}) {
  const [filter, setFilter] = useState(
      kind === "responses" ? "all" : "pending",
    ),
    [message, setMessage] = useState(""),
    [reason, setReason] = useState(""),
    [inspect, setInspect] = useState<Entry | null>(null);
  const filters: Filter[] = filter === "all" ? [] : [["status", "==", filter]];
  const page = usePage(kind, filters);
  async function moderate(collection: string, id: string, status: string) {
    try {
      await act("moderate", { collection, id, status, reason });
      setMessage("Review decision recorded.");
      setInspect(null);
    } catch (error) {
      setMessage(explain(error));
    }
  }
  return (
    <>
      <h2>{kind === "responses" ? "Private answers" : `Review ${kind}`}</h2>
      {kind !== "responses" && (
        <>
          <label>
            Show
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="pending">Awaiting review</option>
              <option value="all">All statuses</option>
            </select>
          </label>
          <label>
            Reason for this moderation decision
            <textarea
              minLength={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </>
      )}
      {kind === "responses" && (
        <>
          <p>
            These are volunteered website responses, not a representative sample
            or validated study. Exports contain private text and account
            identifiers. A participant may withdraw an answer; remove withdrawn
            records from any downloaded working copies.
          </p>
          <button
            className="secondary"
            onClick={() =>
              download(
                {
                  exportedAt: new Date().toISOString(),
                  scope: "visible page only, up to 25 answers",
                  responses: page.rows,
                },
                "private-answers-page.json",
              )
            }
          >
            Export this page of answers
          </button>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {page.rows.map((row) => (
        <article className="community-entry" key={row.id}>
          <h3>
            {row.title || row.experimentId || row.displayName || "Report"}
          </h3>
          {kind === "responses" && <h4>Initial response</h4>}
          <p className="preserve-lines">
            {row.body || row.initial || row.scenario || row.reason}
          </p>
          {row.question && <p>{row.question}</p>}
          {row.final && (
            <>
              <h4>Response after the later condition</h4>
              <p className="preserve-lines">{row.final}</p>
            </>
          )}
          <small>
            {row.status || `Version ${row.version}`} ·{" "}
            {new Date(row.createdAt).toLocaleString()}
          </small>
          <div className="community-actions">
            {kind === "posts" && (
              <>
                <button
                  disabled={reason.trim().length < 3}
                  onClick={() => void moderate(kind, row.id, "published")}
                >
                  Publish post
                </button>
                <button
                  disabled={reason.trim().length < 3}
                  className="quiet"
                  onClick={() => void moderate(kind, row.id, "hidden")}
                >
                  Hide post
                </button>
              </>
            )}
            {kind === "proposals" && (
              <>
                <button
                  disabled={reason.trim().length < 3}
                  onClick={() => void moderate(kind, row.id, "published")}
                >
                  Publish proposal
                </button>
                <button
                  disabled={reason.trim().length < 3}
                  className="quiet"
                  onClick={() => void moderate(kind, row.id, "rejected")}
                >
                  Reject proposal
                </button>
                {canFeature && (
                  <button className="secondary" onClick={() => onFeature(row)}>
                    Prepare featured experiment
                  </button>
                )}
              </>
            )}
            {kind === "reports" && (
              <>
                <button
                  onClick={async () => {
                    try {
                      const target = await getDoc(
                        doc(database!, "posts", row.postId!),
                      );
                      if (!target.exists())
                        throw Error("The reported post was deleted.");
                      setInspect({ id: target.id, ...target.data() } as Entry);
                    } catch (error) {
                      setMessage(explain(error));
                    }
                  }}
                >
                  Inspect reported post
                </button>
                <button
                  disabled={reason.trim().length < 3}
                  className="quiet"
                  onClick={() => void moderate(kind, row.id, "resolved")}
                >
                  Resolve report
                </button>
              </>
            )}
          </div>
        </article>
      ))}
      {inspect && (
        <article className="notice">
          <h3>Reported post</h3>
          <p>{inspect.body}</p>
          <button
            disabled={reason.trim().length < 3}
            onClick={() => void moderate("posts", inspect.id, "hidden")}
          >
            Hide reported post
          </button>
          <button className="quiet" onClick={() => setInspect(null)}>
            Close
          </button>
        </article>
      )}
      {!page.loading && page.rows.length === 0 && <p>No records to show.</p>}
      <Pager page={page} />
    </>
  );
}
