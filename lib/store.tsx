"use client";

// ponytail: the whole fake backend lives here. Swapping to real endpoints means replacing the
// bodies of these five functions — nothing that consumes the context needs to change.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { paginate, questions as SEED, type Question } from "./mock";

const LATENCY = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const PAGE_SIZE = 10;
export const MAX_BODY = 500;

// Oldest first — `order by created_at asc`. For a recorded event that means the replay
// timestamps run start → end down the page; for a live one it's the order they were asked, which
// is the order the speaker works through them.
const INITIAL: Question[] = SEED;

type Ctx = {
  /** Every question the client currently knows about, oldest first. */
  all: Question[];
  addQuestion: (input: { eventId: string; body: string; author: string | null }) => Promise<void>;
  setAnswer: (id: string, answer: string) => Promise<void>;
  /** Server-side truth for one event, page by page. */
  fetchPage: (eventId: string, cursor: string | null) => Promise<{ items: Question[]; nextCursor: string | null }>;
};

const QaContext = createContext<Ctx | null>(null);

export function QaProvider({ children }: { children: ReactNode }) {
  // `dbRef` is the table; `db` is the render copy. Callbacks read the ref so their identity
  // never changes with the data — a fetchPage that changed every write would loop any effect
  // that depends on it.
  const dbRef = useRef(INITIAL);
  const [db, setDb] = useState(INITIAL);
  const commit = useCallback((next: Question[]) => {
    dbRef.current = next;
    setDb(next);
  }, []);

  const addQuestion = useCallback<Ctx["addQuestion"]>(
    async (input) => {
      await sleep(LATENCY);
      const q: Question = {
        id: `q-${input.eventId}-${dbRef.current.length + 1}`,
        eventId: input.eventId,
        body: input.body,
        author: input.author,
        answer: null,
        createdAt: new Date().toISOString(),
      };
      commit([...dbRef.current, q]);
    },
    [commit],
  );

  const setAnswer = useCallback<Ctx["setAnswer"]>(
    async (id, answer) => {
      await sleep(LATENCY);
      commit(
        dbRef.current.map((q) => (q.id === id ? { ...q, answer: answer.trim() || null } : q)),
      );
    },
    [commit],
  );

  const fetchPage = useCallback<Ctx["fetchPage"]>(async (eventId, cursor) => {
    await sleep(LATENCY);
    return paginate(
      dbRef.current.filter((q) => q.eventId === eventId),
      cursor,
      PAGE_SIZE,
    );
  }, []);

  const value = useMemo(
    () => ({ all: db, addQuestion, setAnswer, fetchPage }),
    [db, addQuestion, setAnswer, fetchPage],
  );

  return <QaContext.Provider value={value}>{children}</QaContext.Provider>;
}

export function useQa() {
  const ctx = useContext(QaContext);
  if (!ctx) throw new Error("useQa must be used inside <QaProvider>");
  return ctx;
}
