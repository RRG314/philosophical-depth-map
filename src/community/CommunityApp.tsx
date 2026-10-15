import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import SiteHeader from "../components/SiteHeader";
import catalogue from "./catalogue.json";
import { configured, database, explain } from "./firebase";
import { SessionProvider, useSession, usePage, Pager } from "./hooks";
import type { Experiment } from "./types";
import Account from "./Account";
import Discussion from "./Discussion";
import ExperimentPage from "./ExperimentPage";
import Proposal from "./Proposal";
import Admin from "./Admin";
import "./community.css";
const builtins = catalogue as Experiment[];
const topics = [
  ["general", "Open discussion"],
  ["ethics", "Ethics"],
  ["knowledge", "Knowledge"],
  ["mind", "Mind"],
  ["reality", "Reality"],
  ["society", "Society and power"],
];
export default function CommunityApp({ route }: { route: string }) {
  return (
    <SessionProvider>
      <Content route={route} />
    </SessionProvider>
  );
}
function Content({ route }: { route: string }) {
  const session = useSession();
  const main = useRef<HTMLElement>(null);
  const [search, setSearch] = useState(""),
    [topic, setTopic] = useState("All");
  const page = usePage(
    "experiments",
    session.admin ? [] : [["status", "==", "published"]],
    "order",
    "asc",
  );
  const experiments = configured
    ? (page.rows as unknown as Experiment[])
    : builtins;
  const [area, slug, proposalId] = route.split("/");
  useEffect(() => {
    main.current?.focus();
    document.title =
      area === "experiments"
        ? "Thought experiments · Philosophical Depth Map"
        : area === "account"
          ? "Your account · Philosophical Depth Map"
          : area === "admin"
            ? "Editorial desk · Philosophical Depth Map"
            : "Discussion · Philosophical Depth Map";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = ["account", "admin"].includes(area)
      ? "noindex,nofollow"
      : "index,follow";
    return () => {
      meta!.remove();
    };
  }, [area, route]);
  return (
    <>
      <a
        className="skip"
        href="#community-main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <SiteHeader />
      <nav className="community-subnav" aria-label="Community navigation">
        <a
          href="#experiments"
          aria-current={area === "experiments" ? "page" : undefined}
        >
          Thought experiments
        </a>
        <a href="#community/general">Discussion</a>
        <a href="#community/questions">Community proposals</a>
        <a href="#community/submit">Propose an experiment</a>
        <a href="#account">{session.user ? "My account" : "Sign in"}</a>
        {session.moderator && <a href="#admin">Editorial desk</a>}
      </nav>
      <main
        id="community-main"
        tabIndex={-1}
        ref={main}
        className="community-main"
      >
        {area === "experiments" ? (
          <section className="community-index">
            <p className="eyebrow">THOUGHT EXPERIMENTS</p>
            <h1>Thought experiments</h1>
            <p className="lead">
              Take time with the scenario before opening its discussion. There
              is no score for the position you choose.
            </p>
            {!configured && (
              <p className="small">
                Reading and private drafts are available now. Online accounts,
                submissions and discussion await the community service
                connection.
              </p>
            )}
            <div className="community-filters">
              <label>
                Search this page
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Title, author or topic"
                />
              </label>
              <label>
                Topic
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {["All", ...new Set(experiments.flatMap((e) => e.tags))].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            {experiments
              .filter(
                (e) =>
                  (e.status === "published" || session.admin) &&
                  (topic === "All" || e.tags.includes(topic)) &&
                  `${e.title} ${e.author} ${e.tags.join(" ")}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .sort((a, b) =>
                a.slug === "the-last-prisoner"
                  ? -1
                  : b.slug === "the-last-prisoner"
                    ? 1
                    : Number(b.featured) - Number(a.featured) ||
                      a.order - b.order,
              )
              .map((e) => (
                <article
                  className={`experiment-index-row ${e.slug === "the-last-prisoner" ? "lead-experiment" : ""}`}
                  key={e.slug}
                >
                  <div>
                    <p className="eyebrow">
                      {e.featured ? "FEATURED · " : ""}
                      {e.kind === "original"
                        ? "ORIGINAL"
                        : e.kind === "community"
                          ? "COMMUNITY"
                          : "HISTORICAL"}
                      {e.status === "draft" ? " · PRIVATE DRAFT" : ""}
                    </p>
                    <h2>
                      <a href={`#experiment/${e.slug}`}>{e.title}</a>
                    </h2>
                    <p>{e.author}</p>
                    <small>{e.tags.join(" · ")}</small>
                  </div>
                  <a className="text-link" href={`#experiment/${e.slug}`}>
                    Read and respond ↗
                  </a>
                </article>
              ))}
            {configured && <Pager page={page} />}
          </section>
        ) : area === "experiment" ? (
          <ExperimentRoute key={slug} slug={slug} />
        ) : area === "account" ? (
          <Account />
        ) : area === "admin" ? (
          <Admin experiments={experiments} />
        ) : slug === "submit" ? (
          <Proposal key={proposalId || "new"} id={proposalId} />
        ) : slug === "questions" ? (
          <Proposals />
        ) : slug === "privacy" ? (
          <Privacy />
        ) : (
          <>
            <nav className="discussion-topics" aria-label="Discussion topics">
              {topics.map(([id, label]) => (
                <a
                  key={id}
                  href={`#community/${id}`}
                  aria-current={slug === id ? "page" : undefined}
                >
                  {label}
                </a>
              ))}
            </nav>
            <Discussion
              key={slug || "general"}
              thread={slug || "general"}
              title={
                experiments.find((e) => e.slug === slug)?.title ||
                topics.find(([id]) => id === slug)?.[1] ||
                slug ||
                "Open discussion"
              }
            />
          </>
        )}
      </main>
      <footer className="community-footer">
        <a href="#community/privacy">Community privacy and guidelines</a>
        <a href="#home">Return to Depth Map</a>
      </footer>
    </>
  );
}
function ExperimentRoute({ slug }: { slug: string }) {
  const [item, setItem] = useState<Experiment | null>(
      !configured ? (builtins.find((e) => e.slug === slug) ?? null) : null,
    ),
    [loading, setLoading] = useState(configured),
    [error, setError] = useState("");
  useEffect(() => {
    if (!database) return;
    return onSnapshot(
      doc(database, "experiments", slug),
      (s) => {
        setItem(s.exists() ? (s.data() as Experiment) : null);
        setLoading(false);
      },
      (e) => {
        setError(explain(e));
        setLoading(false);
      },
    );
  }, [slug]);
  if (loading)
    return (
      <p className="community-reading" role="status">
        Opening the experiment…
      </p>
    );
  if (error || !item)
    return (
      <section className="community-reading">
        <h1>Experiment unavailable</h1>
        <p>{error || "This experiment is not published or does not exist."}</p>
        <a href="#experiments">Browse the collection</a>
      </section>
    );
  return <ExperimentPage key={`${slug}-${item.version}`} experiment={item} />;
}
function Proposals() {
  const page = usePage("proposals", [["status", "==", "published"]]);
  return (
    <section className="community-reading">
      <h1>From the community</h1>
      <p>
        Reviewed proposals from readers.{" "}
        <a href="#community/submit">Submit your own experiment</a>.
      </p>
      {page.rows.map((row) => (
        <article className="community-entry" key={row.id}>
          <h2>{row.title}</h2>
          <small>Proposed by {row.displayName}</small>
          <p className="preserve-lines">{row.scenario}</p>
          <p>{row.question}</p>
        </article>
      ))}
      {!page.loading && page.rows.length === 0 && (
        <p>No reviewed proposals yet.</p>
      )}
      <Pager page={page} />
    </section>
  );
}
function Privacy() {
  const [contact, setContact] = useState("");
  useEffect(() => {
    if (!database) return;
    return onSnapshot(doc(database, "settings", "public"), (s) =>
      setContact(s.data()?.privacyContact || ""),
    );
  }, []);
  return (
    <article className="community-reading">
      <h1>Community privacy and guidelines</h1>
      <h2>What you share</h2>
      <p>
        Reading does not require an account. Experiment drafts are stored in
        this browser tab’s session storage and can be cleared from the response
        screen. A draft is not uploaded automatically. Firebase handles
        community accounts and stores an email address, account identifier and
        authentication records.
      </p>
      <p>
        Public posts and proposals use your chosen display name. They are
        reviewed before publication. Do not include private information about
        yourself or another person. Public material may be copied by other
        readers.
      </p>
      <h2>Private experiment answers</h2>
      <p>
        Only an explicit submission sends your answers to the site owner. The
        consent notice appears beside the submit button. The service records the
        two responses when applicable, the scenario and version, account
        identifier, submission time, prior-exposure answer and consent version.
        No answer is ranked or automatically interpreted. The owner may examine
        and export responses to understand how people reason about the
        experiments; responses are not automatically published.
      </p>
      <p>
        Private answers are retained for up to 365 days, then removed by a daily
        deletion job (allow up to 24 hours for processing). Withdraw an answer
        or download your data from your account. Contact the owner about any
        exported working copy. Participation does not enroll you in the separate
        Reasoning Lab study.
      </p>
      <h2>Accounts and removal</h2>
      <p>
        Delete your account from the account page after confirming your
        password. This removes your posts, proposals, private responses,
        reports, bookmarks and profile from the active service. Replies from
        other people remain, without your deleted text. A featured editorial
        adaptation is a separate publication; contact the owner about
        attribution or removal. Hosting and authentication providers may retain
        security logs under their own policies. The application does not write
        answer bodies into request logs.
      </p>
      <p>
        {contact
          ? `Privacy and removal contact: ${contact}`
          : "A live privacy contact has not been configured. Private answer collection must remain off until one is available."}
      </p>
      <h2>Discussion guidelines</h2>
      <p>
        Address ideas and reasons. No harassment, threats, private personal
        information, impersonation, or spam. Difficult hypothetical subjects are
        welcome; directing abuse at real people is not. Give sources when
        quoting, and distinguish an argument from its author. Posts and edits
        enter the review queue. You can report published posts; moderators can
        hide them and record a reason. This site has no direct messaging or
        uploads.
      </p>
      <h2>Technical providers</h2>
      <p>
        Firebase Authentication, Cloud Firestore and Cloud Functions support the
        community. The existing Depth Map journal remains separate and local to
        your browser. We do not send community posts or private answers to a
        language model.
      </p>
      <a
        href="https://firebase.google.com/support/privacy"
        target="_blank"
        rel="noreferrer"
      >
        Firebase privacy information ↗
      </a>
    </article>
  );
}
