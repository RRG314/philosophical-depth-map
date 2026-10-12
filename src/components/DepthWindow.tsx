import { useState, type CSSProperties } from "react";
import type { State } from "../lib/model";
import { expeditionProgress, stations } from "../game/progression";

/** A progress instrument, not a second game loop. Uses the ocean's own milestones. */
export default function DepthWindow({
  state,
  onToggle,
}: {
  state: State;
  onToggle: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { count, unlocked, next } = expeditionProgress(state);
  const station = stations[unlocked];
  const compact = state.settings.diver === "minimized";
  return (
    <aside
      className={`depth-window ${compact ? "is-compact" : ""}`}
      aria-label="Your ocean depth"
      data-motion={state.settings.motion}
      style={{ "--depth-position": `${5 + unlocked * 9}%` } as CSSProperties}
    >
      <div className="depth-window-heading">
        <span>Your depth</span>
        <button
          className="quiet"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError("");
            try {
              await onToggle();
            } catch {
              setError("Could not save this preference. Please try again.");
            } finally {
              setSaving(false);
            }
          }}
          aria-label={compact ? "Expand depth window" : "Minimize depth window"}
          aria-expanded={!compact}
        >
          {compact ? "+" : "−"}
        </button>
      </div>
      <a
        className="depth-seascape"
        href={`#expedition/${unlocked}`}
        aria-label={`Visit ${station.name}`}
      >
        <div className="depth-water" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="depth-ruler" aria-hidden="true">
          <span>Shore</span>
          <span>Reef</span>
          <span>Twilight</span>
          <span>Trench</span>
        </div>
        <span className="depth-location" aria-hidden="true">
          <b />
          {station.depth}
        </span>
        <span className="depth-window-open">Enter the ocean ↗</span>
      </a>
      {error && <p role="status">{error}</p>}
      <div className="depth-window-caption">
        <a href={`#expedition/${unlocked}`}>{station.name}</a>
        <p>
          {count} {count === 1 ? "question" : "questions"} explored
        </p>
        <meter
          min={next ? station.need : 0}
          max={next?.need ?? Math.max(count, station.need, 1)}
          value={count}
          aria-label="Progress to the next ocean milestone"
        />
        <p className="depth-next">
          {next
            ? `${next.need - count} more to ${next.name.toLowerCase()}`
            : "Every depth is open. Keep exploring."}
        </p>
        <small>
          Saved reflections mark your depth. Every ocean area is free to visit.
        </small>
      </div>
    </aside>
  );
}
