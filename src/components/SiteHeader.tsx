import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const pages = [
  ["assessment", "Depth Map assessment"],
  ["achievements", "Achievements"],
  ["library", "Concept library"],
  ["about", "About Depth Map"],
  ["scoring", "How scoring works"],
  ["research", "Depth Map research"],
  ["privacy", "Privacy & data"],
  ["accessibility", "Accessibility"],
  ["settings", "Settings"],
];
export default function SiteHeader() {
  const route = useSyncExternalStore(
    subscribe,
    () => location.hash.split("/")[0] || "#home",
  );
  return (
    <header className="topbar">
      <a className="brand" href="#home">
        <span className="brand-mark" aria-hidden="true">
          ◒
        </span>
        <span>
          PHILOSOPHICAL
          <br />
          <b>DEPTH MAP</b>
        </span>
      </a>
      <nav aria-label="Main navigation">
        <a
          href="#experiments"
          aria-current={route.startsWith("#experiment") ? "page" : undefined}
        >
          Thought experiments
        </a>
        <a
          href="#community/general"
          aria-current={route === "#community" ? "page" : undefined}
        >
          Discuss
        </a>
        <a
          href="#explore"
          aria-current={route === "#explore" ? "page" : undefined}
        >
          Explore
        </a>
        <a
          href="#expedition"
          aria-current={route === "#expedition" ? "page" : undefined}
        >
          Ocean
        </a>
        <a href="#map" aria-current={route === "#map" ? "page" : undefined}>
          The map
        </a>
        <a
          href="#progress"
          aria-current={route === "#progress" ? "page" : undefined}
        >
          My journal
        </a>
        <a href="#lab" aria-current={route === "#lab" ? "page" : undefined}>
          Reasoning Lab
        </a>
        <a href="#learn" aria-current={route === "#learn" ? "page" : undefined}>
          Learn
        </a>
        <details className="menu">
          <summary>More</summary>
          <div>
            <a
              href="#progress"
              aria-current={route === "#progress" ? "page" : undefined}
            >
              My progress
            </a>
            {pages.map(([path, label]) => (
              <a
                key={path}
                href={"#" + path}
                onClick={(e) =>
                  e.currentTarget.closest("details")?.removeAttribute("open")
                }
              >
                {label}
              </a>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}
