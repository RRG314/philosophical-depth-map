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
        {[
          ["home", "Home"],
          ["experiments", "Thought experiments"],
          ["learn", "Learn"],
          ["community/general", "Discuss"],
          ["progress", "My journey"],
        ].map(([path, label]) => (
          <a
            key={path}
            href={`#${path}`}
            aria-current={
              (
                path === "experiments"
                  ? route.startsWith("#experiment")
                  : path === "community/general"
                    ? route === "#community"
                    : path === "progress"
                      ? [
                          "#progress",
                          "#map",
                          "#expedition",
                          "#achievements",
                        ].includes(route)
                      : path === "learn"
                        ? ["#learn", "#lab", "#library", "#explore"].includes(
                            route,
                          )
                        : route === `#${path}`
              )
                ? "page"
                : undefined
            }
          >
            {label}
          </a>
        ))}
        <details className="menu">
          <summary>Account &amp; more</summary>
          <div>
            <a
              href="#progress"
              aria-current={route === "#progress" ? "page" : undefined}
            >
              My journey
            </a>
            <a href="#account">Account &amp; community activity</a>
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
