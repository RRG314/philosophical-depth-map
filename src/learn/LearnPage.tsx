import { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import resources from "./resources.json";
import "../lab/lab.css";
export default function LearnPage() {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All");
  const groups = ["All", ...new Set(resources.map((r) => r.category))];
  const found = resources.filter(
    (r) =>
      (category === "All" || r.category === category) &&
      `${r.title} ${r.note}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <a
        className="skip"
        href="#learn-main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("learn-main")?.focus();
        }}
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="learn-main" tabIndex={-1} className="section">
        <p className="eyebrow">THE LEARNING LIBRARY</p>
        <h1>Read beyond the question.</h1>
        <p className="lead">
          Philosophers, traditions, primary texts and careful introductions.
          Choose a route through the ideas, then return to a question with
          something new to consider.
        </p>
        <div className="learn-paths">
          <article className="card">
            <h2>Start with a method</h2>
            <p>
              Read an introduction to Socrates, Descartes or Dewey, then examine
              a primary passage before trying its Lab reconstruction.
            </p>
            <a href="#lab/methods">Explore the four methods →</a>
          </article>
          <article className="card">
            <h2>Follow a philosophical problem</h2>
            <p>
              Move from knowledge, ethics or mind to a source, and compare the
              strongest reasons on more than one side.
            </p>
            <a href="#explore">Find a question →</a>
          </article>
          <article className="card">
            <h2>Learn to assess an argument</h2>
            <p>
              Practice identifying a conclusion, its supporting premises and a
              relevant objection. Neither jargon nor length is the goal.
            </p>
            <a href="#lab/demo">Inspect an argument →</a>
          </article>
        </div>
        <h2>Browse the reading directory</h2>
        <p>
          These links are starting points, not an exhaustive or culturally
          representative canon. Reference articles can be demanding; primary
          translations and editions differ. A publisher link may require library
          access.
        </p>
        <div className="learn-filters">
          <label>
            Search philosophers and ideas
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dewey, consciousness, justice…"
            />
          </label>
          <label>
            Reading category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <p role="status">{found.length} reading resources</p>
        <div className="learn-catalog">
          {found.map((r) => (
            <article key={r.id}>
              <span className="eyebrow">{r.category}</span>
              <h2>{r.title}</h2>
              <p>{r.note}</p>
              <p className="resource-meta">
                {r.kind} · {r.access}
                <br />
                Link checked {r.verified}
              </p>
              <a href={r.url} target="_blank" rel="noreferrer">
                Read {r.title} ↗
              </a>
            </article>
          ))}
        </div>
        {found.length === 0 && (
          <p>
            No matching resource. Try a philosopher's surname or a broader idea.
          </p>
        )}
        <p className="small">
          The source audit is in the repository. A verified link does not mean
          every interpretation in the linked work is endorsed or that the whole
          work has been critically reviewed.
        </p>
        <a href="#library">Browse the Depth Map concept library →</a>
      </main>
    </>
  );
}
