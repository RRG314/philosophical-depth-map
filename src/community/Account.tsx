import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, act, configured, explain } from "./firebase";
import { useSession, usePage, Pager, download } from "./hooks";
export default function Account() {
  const session = useSession();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [signup, setSignup] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      setMessage(explain(e));
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void run(
      async () => {
        if (!auth) return;
        if (signup) {
          const credential = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          await act("profile", { displayName: name });
          await sendEmailVerification(credential.user);
        } else await signInWithEmailAndPassword(auth, email, password);
      },
      signup
        ? "Account created. Check your email to verify it before posting."
        : "Signed in.",
    );
  }
  return (
    <section className="community-reading">
      <h1>Your account</h1>
      {message && <p role="status">{message}</p>}
      {!configured ? (
        <p>
          Community accounts are not connected yet. You can read and try every
          featured experiment without an account; nothing is uploaded.
        </p>
      ) : !session.ready ? (
        <p>Opening your account…</p>
      ) : !session.user ? (
        <>
          <form onSubmit={submit}>
            <h2>{signup ? "Create an account" : "Sign in"}</h2>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                required
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {signup && (
              <label>
                Public display name
                <input
                  required
                  minLength={2}
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <p className="small">
              Your display name appears beside public posts. Private experiment
              answers are separate. Read the{" "}
              <a href="#community/privacy">privacy notice and guidelines</a>.
            </p>
            <button disabled={busy}>
              {signup ? "Create account" : "Sign in"}
            </button>
          </form>
          <div className="community-actions">
            <button className="quiet" onClick={() => setSignup(!signup)}>
              {signup ? "Already have an account?" : "Create an account"}
            </button>
            <button
              className="quiet"
              disabled={busy || !email}
              onClick={() =>
                void run(
                  () => sendPasswordResetEmail(auth!, email),
                  "If this address can receive a reset email, check its inbox.",
                )
              }
            >
              Reset password
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Signed in as <strong>{session.name || session.user.email}</strong>.
          </p>
          {!session.user.emailVerified && (
            <p>
              Please verify your email before posting or submitting answers.
            </p>
          )}
          <div className="community-actions">
            {!session.user.emailVerified && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(
                    () => sendEmailVerification(session.user!),
                    "Verification email sent.",
                  )
                }
              >
                Send verification email
              </button>
            )}
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await session.user!.reload();
                  await session.user!.getIdToken(true);
                }, "Account refreshed.")
              }
            >
              Refresh verification
            </button>
            <button
              className="quiet"
              disabled={busy}
              onClick={() => void run(() => signOut(auth!), "Signed out.")}
            >
              Sign out
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await act("profile", { displayName: name });
                await session.user!.getIdToken(true);
              }, "Display name saved. Existing posts keep their original attribution.");
            }}
          >
            <label>
              Change display name
              <input
                minLength={2}
                maxLength={60}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button disabled={busy}>Save display name</button>
          </form>
          <h2>Your activity</h2>
          <Activity key={session.user.uid} />
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              void run(
                async () =>
                  download(await act("exportMine"), "my-community-data.json"),
                "Your data export is ready.",
              )
            }
          >
            Download my community data
          </button>
          <hr />
          <h2>Delete account and contributions</h2>
          <p>
            This removes your profile, posts, proposals, private answers,
            reports and bookmarks from the active service. Published editorial
            experiments are independent of proposal records; contact the owner
            about editorial attribution.
          </p>
          {!deleting ? (
            <button className="danger" onClick={() => setDeleting(true)}>
              Delete my account…
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await reauthenticateWithCredential(
                    session.user!,
                    EmailAuthProvider.credential(
                      session.user!.email!,
                      password,
                    ),
                  );
                  await session.user!.getIdToken(true);
                  await act("deleteAccount");
                  await signOut(auth!);
                }, "Account and contributions deleted.");
              }}
            >
              <label>
                Confirm your password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="danger" disabled={busy}>
                Permanently delete account and data
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() => setDeleting(false)}
              >
                Cancel
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
function Activity() {
  const { user } = useSession();
  const [kind, setKind] = useState("posts"),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(""),
    [editBody, setEditBody] = useState("");
  const page = usePage(kind, [["uid", "==", user!.uid]]);
  return (
    <>
      <label>
        Show
        <select
          aria-label="Show"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="posts">My posts</option>
          <option value="proposals">My proposed experiments</option>
          <option value="responses">My private answers</option>
          <option value="bookmarks">Followed discussions</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {page.rows.map((row) => (
        <article className="community-entry" key={row.id}>
          <h3>{row.title || row.experimentId || row.thread || "Response"}</h3>
          <p className="preserve-lines">
            {row.body || row.initial || row.scenario}
          </p>
          {row.final && <p className="preserve-lines">{row.final}</p>}
          <small>
            {row.status || "Private"} ·{" "}
            {new Date(row.createdAt).toLocaleDateString()}
          </small>
          <div className="community-actions">
            {row.thread && (
              <a href={`#community/${row.thread}`}>Open discussion</a>
            )}
            {kind === "proposals" && (
              <a href={`#community/submit/${row.id}`}>Edit proposal</a>
            )}
            {kind === "posts" && (
              <>
                <button
                  className="quiet"
                  onClick={() => {
                    setEditing(row.id);
                    setEditBody(row.body || "");
                  }}
                >
                  Edit post
                </button>
                <button
                  className="quiet"
                  onClick={() => {
                    if (confirm("Delete this post?"))
                      void act("deletePost", { id: row.id }).catch((e) =>
                        setError(explain(e)),
                      );
                  }}
                >
                  Delete post
                </button>
              </>
            )}
            {kind === "bookmarks" && (
              <button
                className="quiet"
                onClick={() =>
                  void act("bookmark", {
                    thread: row.thread,
                    enabled: false,
                  }).catch((e) => setError(explain(e)))
                }
              >
                Unfollow
              </button>
            )}

            {kind === "responses" && (
              <button
                className="quiet"
                onClick={() => {
                  if (confirm("Permanently withdraw this private answer?"))
                    void act("withdraw", { id: row.id }).catch((e) =>
                      setError(explain(e)),
                    );
                }}
              >
                Withdraw answer
              </button>
            )}
            {kind === "proposals" && (
              <button
                className="quiet"
                onClick={() => {
                  if (confirm("Delete this proposal?"))
                    void act("deleteProposal", { id: row.id }).catch((e) =>
                      setError(explain(e)),
                    );
                }}
              >
                Delete proposal
              </button>
            )}
          </div>
          {editing === row.id && kind === "posts" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await act("editPost", { id: row.id, body: editBody });
                  setEditing("");
                } catch (error) {
                  setError(explain(error));
                }
              }}
            >
              <label>
                Edit post text
                <textarea
                  required
                  maxLength={10000}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
              </label>
              <button>Save for review</button>
              <button
                className="quiet"
                type="button"
                onClick={() => setEditing("")}
              >
                Cancel edit
              </button>
            </form>
          )}
        </article>
      ))}
      {!page.loading && !page.error && page.rows.length === 0 && (
        <p>No entries here yet.</p>
      )}
      <Pager page={page} />
    </>
  );
}
