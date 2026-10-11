import { useEffect, useRef, useState } from "react";
import { type Question, type State } from "../lib/model";
import { expeditionProgress, stations, missions } from "./progression";
import { createExpeditionScene, type SceneAPI } from "./scene";
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
    try {
      api.current = createExpeditionScene(
        canvas.current,
        station,
        !paused,
        () => setFallback(true),
        setAssets,
        setTelemetry,
        setSelected,
      );
    } catch (error) {
      console.error("Ocean could not start", error);
      setFallback(true);
      return;
    }
    const w = window as unknown as {
      render_game_to_text: () => string;
      advanceTime: (ms: number) => void;
    };
    w.render_game_to_text = () =>
      JSON.stringify({
        route: "expedition",
        completedInquiries: progress.count,
        ...(api.current?.snapshot() as object),
      });
    w.advanceTime = (ms) => api.current?.step(ms);
    return () => {
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
  const current = stations[station];
  const stops = missions(state, questions, station);
  return (
    <section className="expedition-page">
      <div className="expedition-heading">
        <div>
          <p className="eyebrow">YOUR OCEAN</p>
          <h1>A little further from shore</h1>
          <p>
            The questions you explore open a deeper ocean. Take some time to
            look around.
          </p>
        </div>
        <a className="button primary" href="#explore">
          Return to the questions
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
          <p className="eyebrow">A PLACE TO PAUSE</p>
          <h2>Take a question with you</h2>
          <p>
            Stop at a reading station, or choose one here. You can also keep
            swimming.
          </p>
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
        {selected !== null && stops[selected] && (
          <article className="station-reading">
            <h3>{stops[selected].question.title}</h3>
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
            <button onClick={() => setSelected(null)}>Keep exploring</button>
          </article>
        )}
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
