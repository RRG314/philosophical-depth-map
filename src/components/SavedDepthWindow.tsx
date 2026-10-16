import { useEffect, useState } from "react";
import { load, save } from "../lib/storage";
import type { State } from "../lib/model";
import DepthWindow from "./DepthWindow";

// Learn and the Lab do not award Depth Map milestones; show the existing journal.
export default function SavedDepthWindow() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    let mounted = true;
    const refresh = () =>
      void load()
        .then((value) => {
          if (mounted) setState(value);
        })
        .catch(() => {});
    refresh();
    window.addEventListener("journey-saved", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("journey-saved", refresh);
    };
  }, []);
  if (!state || state.settings.diver === "dismissed") return null;
  return (
    <DepthWindow
      state={state}
      onToggle={async () => {
        const next: State = {
          ...state,
          settings: {
            ...state.settings,
            diver:
              state.settings.diver === "expanded" ? "minimized" : "expanded",
          },
        };
        await save(next);
        setState(next);
      }}
    />
  );
}
