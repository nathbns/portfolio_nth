"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// A real measurement on the visitor's own CPU: one integer loop, split across
// 1, 2, 4… Web Workers and timed end to end. Nothing leaves the page.

const SOURCE = `onmessage = (e) => {
  let x = (e.data.seed | 0) || 1;
  let acc = 0;
  for (let i = e.data.n; i > 0; i--) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    acc = (acc + (x & 255)) | 0;
  }
  postMessage(acc);
};`;

const TARGET = 300; // ms for one worker to do the whole job
const PASSES = 3; // interleaved passes; each count keeps its best time

type Row = { workers: number; ms: number };

function plan(cores: number) {
  const counts: number[] = [];
  for (let p = 1; p < cores; p *= 2) counts.push(p);
  counts.push(cores);
  return counts;
}

function time(pool: Worker[], workers: number, n: number) {
  const each = Math.max(1, Math.floor(n / workers));
  const start = performance.now();
  return Promise.all(
    pool.slice(0, workers).map(
      (worker, i) =>
        new Promise<void>((resolve) => {
          worker.onmessage = () => resolve();
          worker.postMessage({ n: each, seed: 0x2545f491 ^ ((i + 1) * 0x9e3779b9) });
        }),
    ),
  ).then(() => performance.now() - start);
}

const subscribe = () => () => {};

export default function Benchmark() {
  const cores = useSyncExternalStore(
    subscribe,
    () => (typeof Worker === "undefined" ? -1 : navigator.hardwareConcurrency || 4),
    () => 0,
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function run() {
    if (state === "running" || cores < 1) return;
    setState("running");
    setRows([]);
    const url = URL.createObjectURL(new Blob([SOURCE], { type: "text/javascript" }));
    const pool = Array.from({ length: cores }, () => new Worker(url));
    try {
      // Warm every worker up so the loop is compiled before anything is timed.
      await time(pool, cores, (1 << 20) * cores);
      let probe = Infinity;
      for (let i = 0; i < 2; i++) probe = Math.min(probe, await time(pool, 1, 1 << 22));
      const n = Math.min(
        Math.max(Math.round((1 << 22) * (TARGET / Math.max(probe, 1))), 1 << 22),
        1 << 30,
      );
      // Interleaving the passes keeps one slow moment (a clock ramping up, a
      // background task) from landing on a single worker count.
      const best = new Map<number, number>();
      for (let pass = 0; pass < PASSES; pass++) {
        for (const workers of plan(cores)) {
          const ms = await time(pool, workers, n);
          if (!alive.current) return;
          best.set(workers, Math.min(best.get(workers) ?? Infinity, ms));
          setRows([...best].map(([p, t]) => ({ workers: p, ms: t })));
        }
      }
      if (alive.current) setState("done");
    } finally {
      pool.forEach((worker) => worker.terminate());
      URL.revokeObjectURL(url);
    }
  }

  const counts = cores > 0 ? plan(cores) : [];
  const base = rows.find((row) => row.workers === 1)?.ms;
  const speedup = (ms: number) => (base ? base / ms : 0);

  let summary = cores === -1 ? "Web Workers aren't available here" : "ready";
  if (state === "running") summary = "running on your CPU…";
  if (state === "done" && rows.length) {
    const last = rows[rows.length - 1];
    const s = speedup(last.ms);
    const p = last.workers;
    // Karp–Flatt: the serial fraction these timings imply.
    const e = p > 1 ? (1 / s - 1 / p) / (1 - 1 / p) : 0;
    summary =
      `${s.toFixed(1)}× on ${p} workers · ${Math.round((s / p) * 100)}% efficient` +
      (p > 1 ? ` · serial fraction ${Math.max(e * 100, 0).toFixed(1)}%` : "");
  }

  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <div className="flex items-baseline justify-between gap-4 font-mono text-[12px] text-muted">
        <span className="text-foreground">Parallel sum</span>
        <span>{cores > 0 ? `${cores} logical cores` : ""}</span>
      </div>

      <table className="mt-3 w-full border-collapse font-mono text-[12px] tabular-nums">
        <thead className="text-muted">
          <tr>
            <th className="py-1 text-left font-normal">workers</th>
            <th className="py-1 text-right font-normal">time</th>
            <th className="py-1 pr-4 text-right font-normal">speedup</th>
            <th className="w-[42%] py-1 text-left font-normal">
              <span className="sr-only">against perfect scaling</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {counts.map((p) => {
            const row = rows.find((r) => r.workers === p);
            const s = row ? speedup(row.ms) : 0;
            return (
              <tr key={p}>
                <td className="py-1">{p}</td>
                <td className="py-1 text-right">{row ? `${Math.round(row.ms)} ms` : "–"}</td>
                <td className="py-1 pr-4 text-right">{row ? `${s.toFixed(1)}×` : "–"}</td>
                <td className="py-1">
                  <div className="relative h-1.5 rounded-full bg-border">
                    {row && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-accent"
                        style={{ width: `${Math.min(s / cores, 1) * 100}%` }}
                      />
                    )}
                    <div
                      aria-hidden
                      className="absolute -top-1 -bottom-1 w-px bg-foreground/50"
                      style={{ left: `${Math.min((p / cores) * 100, 99.6)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-[12px] text-muted">
        <span aria-live="polite">{summary}</span>
        <button
          type="button"
          onClick={run}
          disabled={state === "running" || cores < 1}
          className="cursor-pointer rounded border border-border px-2 py-0.5 text-foreground transition-colors hover:border-foreground/40 disabled:cursor-default disabled:opacity-50"
        >
          {state === "done" ? "Run again" : "Run"}
        </button>
      </div>
    </div>
  );
}
