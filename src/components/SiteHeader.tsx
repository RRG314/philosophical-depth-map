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
        <a href="#explore">Explore</a>
        <a href="#map">The map</a>
        <a href="#progress">My journal</a>
        <a href="#lab">Reasoning Lab</a>
        <a href="#learn">Learn</a>
        <details className="menu">
          <summary>More</summary>
          <div>
            <a href="#progress">My progress</a>
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
