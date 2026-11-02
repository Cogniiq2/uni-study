"use client";
/**
 * Offline-first progress store.
 *
 * - Every review is applied in memory + localStorage immediately (instant UI, works offline).
 * - When signed in to Supabase, changes are upserted to the cloud; failures are queued and
 *   retried on reconnect. On load, local and cloud states are merged (last write wins per item).
 * - Without Supabase config the app runs in "local" mode (this browser only).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "../supabase/browser";
import type { Grade } from "../grading";
import { review, type ItemState } from "./scheduler";

type Mode = "learn" | "review" | "exam";

interface RecordMeta {
  mode: Mode;
  score?: number;
  durationMs?: number;
}

interface ProgressContextValue {
  ready: boolean;
  states: Map<string, ItemState>;
  /** reviews per local day (YYYY-MM-DD) */
  activity: Record<string, number>;
  record: (uid: string, grade: Grade, meta: RecordMeta) => ItemState;
  storage: "local" | "cloud";
  user: User | null;
  syncError: string | null;
  resetLocal: () => void;
}

const Ctx = createContext<ProgressContextValue | null>(null);

const K_STATES = "uni-study:v1:states";
const K_PENDING = "uni-study:v1:pending";
const K_LOGQ = "uni-study:v1:logqueue";
const K_ACTIVITY = "uni-study:v1:activity";

interface LogRow {
  uid: string;
  grade: Grade;
  score: number | null;
  mode: Mode;
  duration_ms: number | null;
  created_at: string;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — in-memory state still works for this session
  }
}

export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase();
  const [states, setStates] = useState<Map<string, ItemState>>(new Map());
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const statesRef = useRef(states);
  statesRef.current = states;
  const flushing = useRef(false);

  const persistStates = (m: Map<string, ItemState>) => save(K_STATES, Object.fromEntries(m));

  /** Push queued item states + review logs to Supabase. */
  const flush = useCallback(async () => {
    if (!supabase || flushing.current) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    flushing.current = true;
    try {
      const pending = load<string[]>(K_PENDING, []);
      if (pending.length) {
        const rows = pending
          .map((uid) => statesRef.current.get(uid))
          .filter((s): s is ItemState => !!s)
          .map((s) => ({ user_id: data.user!.id, uid: s.uid, srs: s.srs, due: s.srs.due, updated_at: s.updatedAt }));
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase.from("item_state").upsert(rows.slice(i, i + 500));
          if (error) throw error;
        }
        // only drop what we sent (new reviews may have been queued meanwhile)
        const sent = new Set(pending);
        save(K_PENDING, load<string[]>(K_PENDING, []).filter((u) => !sent.has(u)));
      }
      const logs = load<LogRow[]>(K_LOGQ, []);
      if (logs.length) {
        for (let i = 0; i < logs.length; i += 500) {
          const { error } = await supabase.from("review_log").insert(logs.slice(i, i + 500));
          if (error) throw error;
        }
        save(K_LOGQ, load<LogRow[]>(K_LOGQ, []).slice(logs.length));
      }
      setSyncError(null);
    } catch (e) {
      setSyncError((e as Error).message ?? "Sync fehlgeschlagen");
    } finally {
      flushing.current = false;
    }
  }, [supabase]);

  // Initial load: local first (instant), then merge cloud.
  useEffect(() => {
    let cancelled = false;
    const local = new Map(Object.entries(load<Record<string, ItemState>>(K_STATES, {})));
    setStates(local);
    setActivity(load(K_ACTIVITY, {}));

    (async () => {
      if (!supabase) return setReady(true);
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user);
      if (!data.user) return setReady(true);

      try {
        const merged = new Map(local);
        const pending = new Set(load<string[]>(K_PENDING, []));
        const remoteUids = new Set<string>();
        // remote → merge (paginate; PostgREST caps rows per request)
        for (let from = 0; ; from += 1000) {
          const { data: rows, error } = await supabase
            .from("item_state")
            .select("uid, srs, updated_at")
            .range(from, from + 999);
          if (error) throw error;
          for (const r of rows ?? []) {
            remoteUids.add(r.uid);
            const mine = merged.get(r.uid);
            if (!mine || new Date(r.updated_at) > new Date(mine.updatedAt)) {
              merged.set(r.uid, { uid: r.uid, srs: r.srs, updatedAt: r.updated_at });
              pending.delete(r.uid);
            } else if (new Date(mine.updatedAt) > new Date(r.updated_at)) {
              pending.add(r.uid);
            }
          }
          if (!rows || rows.length < 1000) break;
        }
        // local-only items (studied before first login / offline) need uploading too
        for (const uid of merged.keys()) if (!remoteUids.has(uid)) pending.add(uid);
        save(K_PENDING, [...pending]);

        // activity from cloud log (last 120 days)
        const since = new Date(Date.now() - 120 * 86400000).toISOString();
        const act: Record<string, number> = {};
        for (let from = 0; ; from += 1000) {
          const { data: logs, error } = await supabase
            .from("review_log")
            .select("created_at")
            .gte("created_at", since)
            .range(from, from + 999);
          if (error) throw error;
          for (const l of logs ?? []) {
            const d = localDay(new Date(l.created_at));
            act[d] = (act[d] ?? 0) + 1;
          }
          if (!logs || logs.length < 1000) break;
        }
        // un-synced local reviews are not in the cloud log yet
        for (const l of load<LogRow[]>(K_LOGQ, [])) {
          const d = localDay(new Date(l.created_at));
          act[d] = (act[d] ?? 0) + 1;
        }

        if (cancelled) return;
        setStates(merged);
        persistStates(merged);
        setActivity(act);
        save(K_ACTIVITY, act);
        setSyncError(null);
        void flush();
      } catch (e) {
        setSyncError((e as Error).message ?? "Sync fehlgeschlagen");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, [supabase, flush]);

  const record = useCallback(
    (uid: string, grade: Grade, meta: RecordMeta): ItemState => {
      const now = new Date();
      const next = review(uid, statesRef.current.get(uid), grade, now);
      const m = new Map(statesRef.current);
      m.set(uid, next);
      statesRef.current = m;
      setStates(m);
      persistStates(m);

      const day = localDay(now);
      setActivity((a) => {
        const n = { ...a, [day]: (a[day] ?? 0) + 1 };
        save(K_ACTIVITY, n);
        return n;
      });

      if (supabase) {
        save(K_PENDING, [...new Set([...load<string[]>(K_PENDING, []), uid])]);
        const log: LogRow = {
          uid,
          grade,
          score: meta.score ?? null,
          mode: meta.mode,
          duration_ms: meta.durationMs ?? null,
          created_at: now.toISOString(),
        };
        save(K_LOGQ, [...load<LogRow[]>(K_LOGQ, []), log]);
        void flush();
      }
      return next;
    },
    [supabase, flush],
  );

  const resetLocal = useCallback(() => {
    for (const k of [K_STATES, K_PENDING, K_LOGQ, K_ACTIVITY]) localStorage.removeItem(k);
    setStates(new Map());
    setActivity({});
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({ ready, states, activity, record, storage: supabase ? "cloud" : "local", user, syncError, resetLocal }),
    [ready, states, activity, record, supabase, user, syncError, resetLocal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProgress must be used inside <ProgressProvider>");
  return v;
}
