import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { database, act, explain } from "./firebase";
import { useSession } from "./hooks";
export default function Proposal({ id }: { id?: string }) {
  const { user } = useSession();
  const [title, setTitle] = useState(""),
    [scenario, setScenario] = useState(""),
    [question, setQuestion] = useState(""),
    [tags, setTags] = useState("Ethics"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id || !database || !user) return;
    void getDoc(doc(database, "proposals", id))
      .then((snap) => {
        const data = snap.data();
        if (!data || data.uid !== user.uid)
          throw Error("This proposal is not yours.");
        setTitle(data.title);
        setScenario(data.scenario);
        setQuestion(data.question);
        setTags(data.tags.join(", "));
      })
      .catch((e) => setMessage(explain(e)));
  }, [id, user]);
  return (
    <section className="community-reading">
      <h1>{id ? "Edit your proposal" : "Propose a thought experiment"}</h1>
      <p>
        Submit a scenario and an open question. Proposals are reviewed before
        appearing publicly; an editor may invite one into the featured
        collection. Publication does not transfer authorship. Use your own
        wording and credit any source or inspiration in the scenario.
      </p>
      {!user?.emailVerified ? (
        <p>
          <a href="#account">Sign in and verify your email</a> to submit a
          proposal.
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await act("proposal", {
                ...(id ? { id } : {}),
                title,
                scenario,
                question,
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              });
              setMessage(
                "Proposal submitted for review. Its status is in your account.",
              );
            } catch (error) {
              setMessage(explain(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Title
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Scenario
            <textarea
              required
              rows={9}
              maxLength={10000}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            />
          </label>
          <label>
            Question
            <textarea
              required
              maxLength={10000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </label>
          <label>
            Topics, separated by commas
            <input
              required
              maxLength={180}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
          <button disabled={busy}>Submit proposal for review</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
