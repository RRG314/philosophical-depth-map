import SavedDepthWindow from "./components/SavedDepthWindow";
import { lazy, Suspense, useEffect, useState } from "react";
const DepthMap = lazy(() => import("./App"));
const Lab = lazy(() => import("./lab/LabApp"));
const Learn = lazy(() => import("./learn/LearnPage"));
export default function SiteRouter() {
  const [route, setRoute] = useState(location.hash.slice(1));
  useEffect(() => {
    const update = () => setRoute(location.hash.slice(1));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return (
    <Suspense
      fallback={
        <main className="reading">
          <h1>Opening the page…</h1>
        </main>
      }
    >
      {route.startsWith("lab") ? (
        <Lab route={route} />
      ) : route.startsWith("learn") ? (
        <Learn />
      ) : (
        <DepthMap />
      )}
      {(route.startsWith("lab") || route.startsWith("learn")) && (
        <SavedDepthWindow />
      )}
    </Suspense>
  );
}
