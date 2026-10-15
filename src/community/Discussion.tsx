import { useState } from "react";
import { act, configured, explain } from "./firebase";
import { useSession, usePage, Pager } from "./hooks";
import type { Entry } from "./types";
export default function Discussion({
  thread,
  title,
}: {
  thread: string;
  title: string;
}) {
  const session = useSession();
  const page = usePage("posts", [
    ["thread", "==", thread],
    ["status", "==", "published"],
  ]);
  const [body, setBody] = useState(""),
    [parent, setParent] = useState<Entry | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  return (
    <section className="community-reading">
      <p className="eyebrow">DISCUSSION</p>
      <h1>{title}</h1>
      <p>
        Explain your reasons, respond to the argument, and leave room for
        disagreement. <a href="#community/privacy">Community guidelines</a>
      </p>
      {!configured && (
        <p className="notice">
          Public discussions are not connected yet. No posts are being
          collected.
        </p>
      )}
      <div className="community-actions">
        <a href="#community/submit">Propose a thought experiment</a>
        {session.user && (
          <button
            className="quiet"
            onClick={() =>
              void act("bookmark", { thread, enabled: true })
                .then(() => setMessage("Discussion added to your account."))
                .catch((e) => setMessage(explain(e)))
            }
          >
            Follow discussion
          </button>
        )}
      </div>
      {page.rows.map((row) => (
        <Post
          key={row.id}
          row={row}
          onReply={() => {
            setParent(row);
            document.getElementById("discussion-reply")?.focus();
          }}
        />
      ))}
      {!page.loading && !page.error && page.rows.length === 0 && (
        <p>No published posts yet.</p>
      )}
      <Pager page={page} />
      {message && <p role="status">{message}</p>}
      {session.user?.emailVerified ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await act("post", {
                thread,
                body,
                parentId: parent?.id ?? null,
                requestId,
              });
              setBody("");
              setParent(null);
              setRequestId(crypto.randomUUID());
              setMessage(
                "Your post is awaiting review. You can find it in your account activity.",
              );
            } catch (error) {
              setMessage(explain(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {parent && (
            <blockquote>
              Replying to {parent.displayName}: {parent.body?.slice(0, 250)}{" "}
              <button
                type="button"
                className="quiet"
                onClick={() => setParent(null)}
              >
                Cancel reply
              </button>
            </blockquote>
          )}
          <label>
            Your contribution
            <textarea
              id="discussion-reply"
              required
              maxLength={10000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
          </label>
          <p className="small">
            Posts are public under your display name once reviewed. Do not
            include contact details or private information.
          </p>
          <button disabled={busy}>Submit post for review</button>
        </form>
      ) : (
        configured && (
          <p>
            <a href="#account">Sign in and verify your email</a> to contribute.
          </p>
        )
      )}
    </section>
  );
}
function Post({ row, onReply }: { row: Entry; onReply: () => void }) {
  const session = useSession();
  const [edit, setEdit] = useState(false),
    [body, setBody] = useState(row.body ?? ""),
    [report, setReport] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(action: string, payload: unknown) {
    setBusy(true);
    try {
      await act(action, payload);
      setEdit(false);
      setReport(false);
      setError(action === "report" ? "Report sent for review." : "");
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="community-entry" id={`post-${row.id}`}>
      <header>
        <strong>{row.displayName}</strong>
        <time dateTime={new Date(row.createdAt).toISOString()}>
          {new Date(row.createdAt).toLocaleDateString()}
        </time>
      </header>
      {row.parentId && (
        <p className="small">
          Reply to an earlier contribution · {row.parentId.slice(-8)}
        </p>
      )}
      {edit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run("editPost", { id: row.id, body });
          }}
        >
          <label>
            Edit your post
            <textarea
              required
              maxLength={10000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button disabled={busy}>Save for review</button>
          <button
            className="quiet"
            type="button"
            onClick={() => setEdit(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <p className="preserve-lines">{row.body}</p>
      )}
      <div className="community-actions">
        {session.user?.emailVerified && (
          <>
            <button className="quiet" onClick={onReply}>
              Reply
            </button>
            <button className="quiet" onClick={() => setReport(!report)}>
              Report
            </button>
          </>
        )}
        {session.user?.uid === row.uid && (
          <>
            <button className="quiet" onClick={() => setEdit(true)}>
              Edit
            </button>
            <button
              className="quiet"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "Delete this post? Replies will remain without its text.",
                  )
                )
                  void run("deletePost", { id: row.id });
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
      {report && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run("report", { postId: row.id, reason });
          }}
        >
          <label>
            Reason for report
            <textarea
              required
              minLength={3}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button disabled={busy}>Send report</button>
        </form>
      )}
      {error && <p role="status">{error}</p>}
    </article>
  );
}
