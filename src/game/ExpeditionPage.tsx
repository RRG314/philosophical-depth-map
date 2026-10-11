import { useEffect, useRef, useState } from "react";
import { type Question, type State } from "../lib/model";
import { expeditionProgress, stations, missions } from "./progression";
import {
  createExpeditionScene,
  type SceneAPI,
  type StationTarget,
} from "./scene";
import { oceanAssets, assetLicense } from "./assets";
import type { AssetState } from "./models";
import { marianaTerrain, bathymetrySource } from "./bathymetry";
import "./expedition.css";
export default function Expedition({
  state,
  questions,
  onStart,
}: {
  state: State;
  questions: Question[];
  onStart: (q: Question) => void;
}) {
  const stationButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const reading = useRef<HTMLDialogElement>(null);
  const [overview, setOverview] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const progress = expeditionProgress(state);
  const [station, setStation] = useState(() => {
    const direct = location.hash.match(/^#expedition\/([0-8])$/);
    return direct ? Number(direct[1]) : progress.unlocked;
  });
  const [textOnly, setTextOnly] = useState(false),
    [fallback, setFallback] = useState(false),
    [paused, setPaused] = useState(!state.settings.motion);
  const [assets, setAssets] = useState<AssetState>({
    loaded: [],
    failed: [],
    pending: 0,
  });
  const [telemetry, setTelemetry] = useState<{
    depth: number;
    swimming: boolean;
  }>({ depth: stations[station].meters, swimming: station >= 3 });
  const canvas = useRef<HTMLCanvasElement>(null),
    api = useRef<SceneAPI | null>(null);
  useEffect(() => {
    const sync = () => {
      const m = location.hash.match(/^#expedition\/([0-8])$/);
      if (m) {
        setStation(Number(m[1]));
        setSelected(null);
        setOverview(false);
      }
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (!canvas.current || textOnly || fallback) return;
    const element = canvas.current;
    const initialize = requestAnimationFrame(() => {
      try {
        api.current = createExpeditionScene(
          element,
          station,
          !paused,
          () => setFallback(true),
          setAssets,
          setTelemetry,
          setSelected,
          (targets: StationTarget[]) => {
            for (const target of targets) {
              const button = stationButtons.current[target.index];
              if (!button) continue;
              button.hidden = !target.visible;
              button.style.left = `${target.x * 100}%`;
              button.style.top = `${target.y * 100}%`;
            }
          },
        );
      } catch (error) {
        console.error("Ocean could not start", error);
        setFallback(true);
        return;
      }
    });
    const w = window as unknown as {
      render_game_to_text: () => string;
      advanceTime: (ms: number) => void;
    };
    w.render_game_to_text = () =>
      JSON.stringify({
        route: "expedition",
        completedInquiries: progress.count,
        ...((api.current?.snapshot() as object) ?? {
          assets: { pending: 1 },
          station,
        }),
      });
    w.advanceTime = (ms) => api.current?.step(ms);
    return () => {
      cancelAnimationFrame(initialize);
      api.current?.dispose();
      api.current = null;
    };
  }, [station, textOnly, fallback, progress.count]);
  useEffect(() => {
    api.current?.setMotion(!paused);
  }, [paused, station]);
  useEffect(() => {
    if (!textOnly && !fallback) return;
    const w = window as unknown as {
      render_game_to_text: () => string;
      advanceTime: (ms: number) => void;
    };
    w.render_game_to_text = () =>
      JSON.stringify({
        route: "expedition",
        renderer: "accessible-text",
        station,
        completedInquiries: progress.count,
      });
    w.advanceTime = () => {};
  }, [textOnly, fallback, station, progress.count]);
  function travel(n: number) {
    history.replaceState(null, "", `#expedition/${n}`);
    setStation(n);
    setSelected(null);
    setOverview(false);
  }
  useEffect(() => {
    if (selected !== null) reading.current?.showModal();
    else reading.current?.close();
  }, [selected]);
  const current = stations[station];
  const stops = missions(state, questions, station);
  return (
    <section className="expedition-page">
      <div className="expedition-heading">
        <div>
          <p className="eyebrow">FIELD NOTES / OCEAN</p>
          <h1>Ocean exploration</h1>
          <p>
            Follow the reef, swim out into open water, or stop with a question.
          </p>
        </div>
        <a className="button primary" href="#explore">
          Back to philosophy
        </a>
      </div>
      <div className="ocean-progress">
        <span>
          {progress.count} {progress.count === 1 ? "question" : "questions"}{" "}
          explored
        </span>
        <span>{stations[progress.unlocked].name}</span>
        <a href="#progress">My journal ↗</a>
      </div>
      <div className="habitat-wrap">
        <div className="habitat-head">
          <div>
            <p className="eyebrow">
              {station > progress.unlocked
                ? "A LOOK AHEAD"
                : "YOUR EXPLORATION"}
            </p>
            <h2>{current.name}</h2>
          </div>
          <strong className="depth-reading">
            {textOnly || fallback
              ? current.depth
              : `${telemetry.depth.toFixed(1)} m`}
            <small>depth</small>
          </strong>
        </div>
        <div className="habitat" data-testid="habitat">
          {!textOnly && !fallback ? (
            <canvas
              ref={canvas}
              tabIndex={0}
              aria-label="Ocean. Arrow keys or W A S D to move. Drag to look around. Q to dive, E to rise. F for fullscreen."
            />
          ) : (
            <div className="habitat-fallback">
              <h3>
                {fallback ? "Your ocean progress" : "Your journey so far"}
              </h3>
              <p>
                {current.name} · {current.depth}. {current.gear}.
              </p>
              <p>Your reflections and progress are in your journal.</p>
              <a href="#progress">Open my journal</a>
            </div>
          )}
          {!textOnly && !fallback && (
            <div
              className="station-targets"
              aria-label="Questions in the ocean"
            >
              {stops.map((stop, n) => (
                <button
                  hidden
                  key={stop.question.id}
                  ref={(el) => {
                    stationButtons.current[n] = el;
                  }}
                  className="station-target"
                  aria-label={`Read station ${n + 1}: ${stop.question.title}`}
                  onClick={() => setSelected(n)}
                >
                  <span>{String(n + 1).padStart(2, "0")}</span>
                  <span className="target-title">{stop.question.title}</span>
                </button>
              ))}
            </div>
          )}
          <dialog
            ref={reading}
            className="ocean-reading"
            aria-labelledby="ocean-question-title"
            onCancel={() => setSelected(null)}
            onClose={() => setSelected(null)}
          >
            {selected !== null && stops[selected] && (
              <>
                <div className="reading-topline">
                  <span>Question {String(selected + 1).padStart(2, "0")}</span>
                  <button
                    aria-label="Close question"
                    onClick={() => setSelected(null)}
                  >
                    ×
                  </button>
                </div>
                <h2 id="ocean-question-title">
                  {stops[selected].question.title}
                </h2>
                <p className="reading-prompt">
                  {stops[selected].question.prompt}
                </p>
                <p>{stops[selected].instruction}</p>
                {state.active ? (
                  <p>
                    You have an unfinished reflection.{" "}
                    <a href="#play">Resume draft</a> before starting another
                    question.
                  </p>
                ) : (
                  <button
                    className="primary"
                    onClick={() => onStart(stops[selected].question)}
                  >
                    Open inquiry →
                  </button>
                )}
                <button className="quiet" onClick={() => setSelected(null)}>
                  Keep exploring
                </button>
              </>
            )}
          </dialog>
          <div className="gear-card">
            <span className="equipment-dot" />
            {station < 4
              ? telemetry.swimming
                ? "Swimming"
                : "Wading"
              : current.gear}
          </div>
          {!textOnly && !fallback && (
            <div className="movement-pad" aria-label="Movement controls">
              {[
                ["↑", 0, -1, 0, "Move forward"],
                ["←", -1, 0, 0, "Move left"],
                ["↓", 0, 1, 0, "Move back"],
                ["→", 1, 0, 0, "Move right"],
                ...(station >= 4
                  ? [
                      ["Dive", 0, 0, -1, "Dive"],
                      ["Rise", 0, 0, 1, "Rise"],
                    ]
                  : []),
              ].map(([symbol, x, z, y, label]) => (
                <button
                  key={label}
                  aria-label={String(label)}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    api.current?.move(Number(x), Number(z), Number(y));
                  }}
                  onPointerUp={() => api.current?.move(0, 0)}
                  onPointerCancel={() => api.current?.move(0, 0)}
                  onLostPointerCapture={() => api.current?.move(0, 0)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      api.current?.move(Number(x), Number(z), Number(y));
                      api.current?.step(250);
                      api.current?.move(0, 0);
                    }
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
          )}
        </div>
        {assets.pending > 0 && !textOnly && (
          <p className="asset-status" role="status">
            Preparing the ocean…
          </p>
        )}
        {assets.failed.length > 0 && !textOnly && (
          <p className="asset-status" role="status">
            Some scenery could not load. Your journal is still available.
          </p>
        )}
        <div className="habitat-tools">
          <span>
            Move: arrows / WASD · Look: drag · Dive / rise: Q / E · Fullscreen:
            F
          </span>
          <div>
            <button onClick={() => api.current?.reset()}>Recenter</button>
            <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
              {paused ? "Resume ocean movement" : "Pause ocean movement"}
            </button>
            <button
              aria-pressed={textOnly}
              onClick={() => setTextOnly(!textOnly)}
            >
              {textOnly ? "Show ocean" : "View progress as text"}
            </button>
          </div>
        </div>
        {station === 8 && (
          <div className="trench-travel">
            <span>Mariana Trench · GEBCO seafloor</span>
            <button
              aria-pressed={overview}
              onClick={() => {
                api.current?.overview(!overview);
                setOverview(!overview);
              }}
            >
              {overview ? "Return to submersible" : "Seafloor overview"}
            </button>
            {marianaTerrain.waypoints.map((p, n) => (
              <button
                key={p.name}
                onClick={() => {
                  api.current?.travel(n);
                  setOverview(false);
                }}
              >
                Travel to {p.name.toLowerCase()}
              </button>
            ))}
            <small>
              Travel points cross kilometres instantly. Nearby movement stays at
              swimming or vehicle speed.
            </small>
          </div>
        )}
        <div className="habitat-strip" aria-label="Ocean destinations">
          {stations.map((s, i) => (
            <button
              key={s.name}
              aria-current={i === station ? "step" : undefined}
              onClick={() => travel(i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{s.name.replace("The ", "")}</b>
              <small>
                {i <= progress.unlocked
                  ? "Explore"
                  : `Look ahead · ${s.need} questions`}
              </small>
            </button>
          ))}
        </div>
      </div>
      <section
        className="question-harbour"
        aria-label="Optional question stations"
      >
        <div>
          <p className="eyebrow">FIELD NOTES</p>
          <h2>Questions on this dive</h2>
          <p>Select a numbered marker in the water, or open a question here.</p>
        </div>
        <div className="station-cards">
          {stops.map((m, n) => (
            <button
              key={m.question.id}
              aria-pressed={selected === n}
              onClick={() => setSelected(n)}
            >
              <span className="station-number">
                {String(n + 1).padStart(2, "0")}
              </span>
              <span>
                <small>{m.kind}</small>
                <strong>{m.question.title}</strong>
              </span>
              <span>↗</span>
            </button>
          ))}
        </div>
      </section>
      <p className="ocean-footnote">
        Your ocean follows the questions you explore. Swimming here doesn’t
        change your progress.
      </p>
      <details className="ocean-credits">
        <summary>Scenery & credits</summary>
        <p>
          Models from Sketchfab, used under <a href={assetLicense}>CC BY 4.0</a>
          . Adaptations include textures, geometry, character rigging, scale and
          animation.
        </p>
        <p>
          The Mariana Trench uses <a href={bathymetrySource.url}>GEBCO 2020</a>,
          sampled through Open Topo Data on {bathymetrySource.retrieved}. Depth
          and distance share the same scale. This regional grid resolves broad
          slopes, not individual rocks. Other habitats are authored scenes;
          wildlife placement and equipment are illustrative. This is not a
          navigation or diving guide.
        </p>
        <ul>
          {oceanAssets.map((a) => (
            <li key={a.id}>
              <a href={`https://sketchfab.com/3d-models/${a.uid}`}>{a.title}</a>{" "}
              by <a href={a.creatorUrl}>{a.creator}</a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
