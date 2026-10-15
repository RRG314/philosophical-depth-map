import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type WhereFilterOp,
} from "firebase/firestore";
import { auth, database, explain } from "./firebase";
import type { Entry } from "./types";
type Session = {
  user: User | null;
  admin: boolean;
  moderator: boolean;
  name: string;
  ready: boolean;
};
const Context = createContext<Session>({
  user: null,
  admin: false,
  moderator: false,
  name: "",
  ready: false,
});
export const useSession = () => useContext(Context);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    admin: false,
    moderator: false,
    name: "",
    ready: !auth,
  });
  useEffect(() => {
    if (!auth) return;
    let generation = 0;
    const stop = onIdTokenChanged(auth, async (user) => {
      const n = ++generation;
      if (!user) {
        setSession({
          user: null,
          admin: false,
          moderator: false,
          name: "",
          ready: true,
        });
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        const profile = database
          ? await getDoc(doc(database, "profiles", user.uid))
          : null;
        if (n === generation)
          setSession({
            user,
            admin: token.claims.admin === true,
            moderator:
              token.claims.moderator === true || token.claims.admin === true,
            name: profile?.data()?.displayName ?? user.displayName ?? "",
            ready: true,
          });
      } catch {
        if (n === generation)
          setSession({
            user,
            admin: false,
            moderator: false,
            name: user.displayName ?? "",
            ready: true,
          });
      }
    });
    return () => {
      generation++;
      stop();
    };
  }, []);
  return <Context.Provider value={session}>{children}</Context.Provider>;
}
export type Filter = [string, WhereFilterOp, string];
export function usePage(
  name: string,
  filters: Filter[] = [],
  sort = "createdAt",
  direction: "asc" | "desc" = "desc",
) {
  const key = JSON.stringify(filters);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [rows, setRows] = useState<Entry[]>([]);
  const [last, setLast] = useState<QueryDocumentSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(database));
  useEffect(() => {
    setCursor(null);
  }, [key, name]);
  useEffect(() => {
    if (!database) return;
    setLoading(true);
    setError("");
    const clauses = (JSON.parse(key) as Filter[]).map(([f, op, v]) =>
      where(f, op, v),
    );
    const q = query(
      collection(database, name),
      ...clauses,
      orderBy(sort, direction),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(25),
    );
    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Entry));
        setLast(snap.docs.at(-1) ?? null);
        setLoading(false);
      },
      (e) => {
        setRows([]);
        setError(explain(e));
        setLoading(false);
      },
    );
  }, [name, key, sort, direction, cursor]);
  return {
    rows,
    error,
    loading,
    next: rows.length === 25 ? () => setCursor(last) : null,
    first: cursor ? () => setCursor(null) : null,
  };
}
export function Pager({ page }: { page: ReturnType<typeof usePage> }) {
  return (
    <div className="community-actions">
      {page.first && (
        <button className="quiet" onClick={page.first}>
          First page
        </button>
      )}
      {page.next && (
        <button className="secondary" onClick={page.next}>
          Next page
        </button>
      )}
      {page.loading && <p role="status">Loading…</p>}
      {page.error && <p role="alert">{page.error}</p>}
    </div>
  );
}
export function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
