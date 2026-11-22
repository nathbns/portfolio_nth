"use client";
// Fiche CM3 : rasterizer et depth buffer (exercice du cours).
// Exemple suivi : image 9 × 9 sur [−1, 1]², v0 = (−0,5 ; −0,5), v1 = (0 ; 0,5),
// v2 = (0,5 ; −0,5), profondeurs 0,2 ; 0,6 ; 0,4, point p = (0 ; 0).
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowMarkers,
  C,
  Choice,
  Code,
  Figure,
  Formula,
  Idea,
  Note,
  Points,
  Reveal,
  Section,
  Slider,
  Stepper,
  Trap,
  motion,
  type Color,
} from "../kit";

// ---------------------------------------------------------------------------
// Données et outils

/** Nombre à la française, d décimales fixes. */
const fr = (x: number, d = 2) => {
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d).replace(".", ",").replace("-", "−");
};

type P2 = [number, number];
const V: P2[] = [
  [-0.5, -0.5],
  [0, 0.5],
  [0.5, -0.5],
];
const VZ = [0.2, 0.6, 0.4];
const edge = (p: P2, a: P2, b: P2) => (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
const TOTAL = edge(V[0], V[1], V[2]); // = 1
/** Centre du pixel d'indice k (0 ≤ k ≤ 8) dans une image 9 × 9 sur [−1, 1]. */
const ctr = (k: number) => ((k + 0.5) / 9) * 2 - 1;
/** λ du cours : λi = edgeSide de l'arête opposée à vi, divisée par total. */
const bary = (p: P2): [number, number, number] => [edge(p, V[1], V[2]) / TOTAL, edge(p, V[2], V[0]) / TOTAL, edge(p, V[0], V[1]) / TOTAL];
/** Couleur de λ0, λ1, λ2 = couleur de l'arête opposée à v0, v1, v2. */
const LCOL: Color[] = ["purple", "orange", "cyan"];
/** Les trois tests, dans l'ordre du cours : (v0, v1), (v1, v2), (v2, v0). */
const EDGES: { a: number; b: number; name: string; col: Color }[] = [
  { a: 0, b: 1, name: "edgeSide(p, v0, v1)", col: "cyan" },
  { a: 1, b: 2, name: "edgeSide(p, v1, v2)", col: "purple" },
  { a: 2, b: 0, name: "edgeSide(p, v2, v0)", col: "orange" },
];
const signs = (p: P2) => EDGES.map((e) => edge(p, V[e.a], V[e.b]));

/** Repère : carré [−1, 1]² dessiné en (ox, oy), de côté size. */
const frame = (ox: number, oy: number, size: number) => ({
  X: (x: number) => ox + ((x + 1) / 2) * size,
  Y: (y: number) => oy + ((1 - y) / 2) * size,
});
const pts = (X: (x: number) => number, Y: (y: number) => number, ps: P2[]) => ps.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ");

const btn = "row border border-line px-3 py-1.5 font-mono text-[13px] text-fg-weak hover:text-fg-strong";

/** Position du pointeur dans le repère [−1, 1]² d'un SVG (viewBox 0 0 vbw vbh). */
function pointerTo(e: PointerEvent<SVGSVGElement>, vbw: number, vbh: number, ox: number, oy: number, size: number): P2 {
  const r = e.currentTarget.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * vbw;
  const sy = ((e.clientY - r.top) / r.height) * vbh;
  const x = ((sx - ox) / size) * 2 - 1;
  const y = 1 - ((sy - oy) / size) * 2;
  const cl = (v: number) => Math.max(-1, Math.min(1, v));
  return [cl(x), cl(y)];
}

// ---------------------------------------------------------------------------
// 1. Centre des pixels

function PixelCenterFig() {
  const [cell, setCell] = useState<P2>([4, 4]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  const sweep = () => {
    if (timer.current) clearInterval(timer.current);
    let i = 0;
    setCell([0, 4]);
    timer.current = setInterval(() => {
      i += 1;
      if (i > 8) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        return;
      }
      setCell([i, 4]);
    }, 450);
  };
  const { X, Y } = frame(40, 12, 297);
  const cs = 33;
  const [ci, cj] = cell;
  const px = ctr(ci);
  const py = ctr(cj);
  return (
    <Figure caption="Survoler ou toucher une case : on teste un seul point par pixel, son centre. Quand i augmente de 1, x avance de 2/9 ≈ 0,22.">
      <div className="space-y-3">
        <button type="button" className={btn} onClick={sweep}>
          ▶ balayer la ligne j = 4
        </button>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <svg viewBox="0 0 350 345" className="w-full max-w-[350px]" role="img" aria-label="Grille 9 × 9 et centre du pixel">
            {Array.from({ length: 81 }, (_, k) => {
              const i = k % 9;
              const j = Math.floor(k / 9);
              const on = i === ci && j === cj;
              return (
                <rect
                  key={k}
                  x={40 + i * cs}
                  y={12 + (8 - j) * cs}
                  width={cs}
                  height={cs}
                  fill={on ? C.yellow : C.paper}
                  fillOpacity={on ? 0.18 : 1}
                  stroke={C.line}
                  onPointerEnter={() => setCell([i, j])}
                  onClick={() => setCell([i, j])}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
            <polygon points={pts(X, Y, V)} fill={C.blue} fillOpacity={0.1} stroke={C.blue} strokeWidth={2} pointerEvents="none" />
            {Array.from({ length: 9 }, (_, k) => (
              <g key={k} pointerEvents="none">
                <text x={40 + k * cs + cs / 2} y={12 + 297 + 16} textAnchor="middle" fontSize={12} fill={k === ci ? C.ink : C.weak}>
                  {k}
                </text>
                <text x={30} y={12 + (8 - k) * cs + cs / 2 + 4} textAnchor="end" fontSize={12} fill={k === cj ? C.ink : C.weak}>
                  {k}
                </text>
              </g>
            ))}
            <text x={40 + 297} y={12 + 297 + 32} textAnchor="end" fontSize={12} fill={C.weak}>
              i →
            </text>
            <text x={10} y={165} fontSize={12} fill={C.weak}>
              j
            </text>
            <motion.circle r={6} fill={C.yellow} animate={{ cx: X(px), cy: Y(py) }} transition={{ duration: 0.25 }} pointerEvents="none" />
          </svg>
          <div className="space-y-2 font-mono text-[14px]" style={{ color: C.ink }}>
            <p style={{ color: C.weak }}>
              pixel (i, j) = ({ci}, {cj})
            </p>
            <p>
              x = ({ci} + 0,5)/9 × 2 − 1 = <span style={{ color: C.yellow }}>{fr(px)}</span>
            </p>
            <p>
              y = ({cj} + 0,5)/9 × 2 − 1 = <span style={{ color: C.yellow }}>{fr(py)}</span>
            </p>
            {ci === 4 && cj === 4 && <p style={{ color: C.green }}>centre = origine : c'est p = (0 ; 0)</p>}
          </div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 2. edgeSide, une aire signée

function EdgeSideFig() {
  const [x, setX] = useState(-0.6);
  const { X, Y } = frame(15, 15, 300);
  const p: P2 = [x, 0];
  const val = edge(p, V[0], V[1]); // = x + 0,25
  const col: Color = val > 0.005 ? "blue" : val < -0.005 ? "red" : "yellow";
  const top: P2 = [V[1][0] + (p[0] - V[0][0]), V[1][1] + (p[1] - V[0][1])];
  return (
    <Figure caption="p = (x ; 0) glisse vers la droite. Le parallélogramme construit sur v0→v1 et v0→p s'aplatit, s'annule sur l'arête (x = −0,25), puis se rouvre de l'autre côté.">
      <div className="space-y-4">
        <Slider label="p.x" value={x} min={-0.6} max={0} step={0.01} onChange={setX} format={(v) => fr(v)} />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <svg viewBox="0 0 330 330" className="w-full max-w-[330px]" role="img" aria-label="edgeSide comme aire signée d'un parallélogramme">
            <ArrowMarkers />
            <rect x={15} y={15} width={300} height={300} fill={C.paper} stroke={C.line} />
            <polygon points={pts(X, Y, [[-0.75, -1], [1, -1], [1, 1], [0.25, 1]])} fill={C.blue} fillOpacity={0.07} />
            <polygon points={pts(X, Y, [[-1, -1], [-0.75, -1], [0.25, 1], [-1, 1]])} fill={C.red} fillOpacity={0.07} />
            <text x={X(0.72)} y={Y(-0.8)} textAnchor="middle" fontSize={20} fill={C.blue}>
              +
            </text>
            <text x={X(-0.8)} y={Y(0.7)} textAnchor="middle" fontSize={20} fill={C.red}>
              −
            </text>
            <line x1={X(-0.75)} y1={Y(-1)} x2={X(0.25)} y2={Y(1)} stroke={C.weak} strokeDasharray="3 4" />
            <polygon points={pts(X, Y, V)} fill="none" stroke={C.lineStrong} strokeDasharray="4 3" />
            <polygon points={pts(X, Y, [V[0], V[1], top, p])} fill={C[col]} fillOpacity={0.22} stroke={C[col]} strokeWidth={1} />
            <polygon points={pts(X, Y, [V[0], V[1], p])} fill={C[col]} fillOpacity={0.25} />
            <line x1={X(V[0][0])} y1={Y(V[0][1])} x2={X(V[1][0])} y2={Y(V[1][1])} stroke={C.ink} strokeWidth={2.5} markerEnd="url(#arr-ink)" />
            <line x1={X(V[0][0])} y1={Y(V[0][1])} x2={X(p[0])} y2={Y(p[1])} stroke={C.yellow} strokeWidth={2} markerEnd="url(#arr-yellow)" />
            <circle cx={X(p[0])} cy={Y(p[1])} r={5} fill={C.yellow} />
            <text x={X(p[0]) - 10} y={Y(p[1]) + 4} textAnchor="end" fontSize={13} fill={C.ink}>
              p
            </text>
            <text x={X(V[0][0]) - 6} y={Y(V[0][1]) + 18} textAnchor="middle" fontSize={13} fill={C.ink}>
              v0
            </text>
            <text x={X(V[1][0]) - 12} y={Y(V[1][1]) - 6} textAnchor="middle" fontSize={13} fill={C.ink}>
              v1
            </text>
            <text x={X(V[2][0]) + 6} y={Y(V[2][1]) + 18} textAnchor="middle" fontSize={13} fill={C.weak}>
              v2
            </text>
          </svg>
          <div className="space-y-2 font-mono text-[14px]" style={{ color: C.ink }}>
            <p>edgeSide(p, v0, v1)</p>
            <p style={{ color: C.weak }}>= (x + 0,5)·1 − (0 + 0,5)·0,5</p>
            <p>
              = x + 0,25 = <span style={{ color: C[col], fontWeight: 600 }}>{fr(val)}</span>
            </p>
            <p style={{ color: C.weak }}>= aire signée = 2 × aire(p, v0, v1)</p>
            <p style={{ color: C[col] }}>{val > 0.005 ? "p est du côté +" : val < -0.005 ? "p est du côté −" : "p est sur l'arête"}</p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Dedans ou dehors : les trois edgeSide (p déplaçable)

function InsideFig() {
  const [p, setP] = useState<P2>([0, 0]);
  const [drag, setDrag] = useState(false);
  const { X, Y } = frame(15, 15, 300);
  const e = signs(p);
  const inside = e.every((v) => v >= 0);
  const move = (ev: PointerEvent<SVGSVGElement>) => setP(pointerTo(ev, 330, 330, 15, 15, 300));
  const presets: { p: P2; label: string }[] = [
    { p: [0, 0], label: "p = (0 ; 0)" },
    { p: [0, -0.7], label: "p = (0 ; −0,7)" },
    { p: [-0.6, 0], label: "p = (−0,6 ; 0)" },
  ];
  // droites portant les arêtes, prolongées jusqu'au bord du carré
  const ext = (a: P2, b: P2): [P2, P2] => {
    const d: P2 = [b[0] - a[0], b[1] - a[1]];
    return [
      [a[0] - d[0] * 3, a[1] - d[1] * 3],
      [a[0] + d[0] * 4, a[1] + d[1] * 4],
    ];
  };
  return (
    <Figure caption="Glisser p (ou toucher le carré). Chaque edgeSide a la couleur de son arête. p est accepté seulement si les trois valeurs sont ≥ 0.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((q) => (
            <button key={q.label} type="button" className={btn} onClick={() => setP(q.p)}>
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <svg
            viewBox="0 0 330 330"
            className="w-full max-w-[330px] cursor-crosshair select-none"
            style={{ touchAction: "none" }}
            role="img"
            aria-label="Triangle et point p déplaçable"
            onPointerDown={(ev) => {
              ev.currentTarget.setPointerCapture(ev.pointerId);
              setDrag(true);
              move(ev);
            }}
            onPointerMove={(ev) => {
              if (drag) move(ev);
            }}
            onPointerUp={() => setDrag(false)}
            onPointerCancel={() => setDrag(false)}
          >
            <defs>
              <clipPath id="rz-inside-clip">
                <rect x={15} y={15} width={300} height={300} />
              </clipPath>
            </defs>
            <rect x={15} y={15} width={300} height={300} fill={C.paper} stroke={C.line} />
            <g clipPath="url(#rz-inside-clip)">
              {EDGES.map((ed) => {
                const [a, b] = ext(V[ed.a], V[ed.b]);
                return <line key={ed.name} x1={X(a[0])} y1={Y(a[1])} x2={X(b[0])} y2={Y(b[1])} stroke={C[ed.col]} strokeOpacity={0.35} strokeDasharray="3 5" />;
              })}
            </g>
            <polygon points={pts(X, Y, V)} fill={inside ? C.green : C.fill2} fillOpacity={inside ? 0.16 : 0.5} />
            {EDGES.map((ed, k) => (
              <g key={ed.name}>
                {e[k] < 0 && (
                  <motion.line
                    x1={X(V[ed.a][0])}
                    y1={Y(V[ed.a][1])}
                    x2={X(V[ed.b][0])}
                    y2={Y(V[ed.b][1])}
                    stroke={C.red}
                    strokeWidth={9}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.15, 0.45, 0.15] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
                <line x1={X(V[ed.a][0])} y1={Y(V[ed.a][1])} x2={X(V[ed.b][0])} y2={Y(V[ed.b][1])} stroke={C[ed.col]} strokeWidth={3} />
              </g>
            ))}
            {["v0", "v1", "v2"].map((n, k) => (
              <text key={n} x={X(V[k][0]) + (k === 1 ? 14 : k === 0 ? -10 : 10)} y={Y(V[k][1]) + (k === 1 ? 0 : 18)} textAnchor="middle" fontSize={13} fill={C.ink}>
                {n}
              </text>
            ))}
            <circle cx={X(p[0])} cy={Y(p[1])} r={8} fill={C.yellow} stroke={C.paper} strokeWidth={2} />
            <text x={X(p[0]) + 11} y={Y(p[1]) + 4} fontSize={13} fill={C.ink}>
              p
            </text>
            <text x={24} y={36} fontSize={13} fill={C.ink}>
              p = ({fr(p[0])} ; {fr(p[1])})
            </text>
          </svg>
          <div className="space-y-2 font-mono text-[14px]">
            {EDGES.map((ed, k) => (
              <p key={ed.name}>
                <span style={{ color: C[ed.col] }}>{ed.name}</span> <span style={{ color: C.ink }}>= {fr(e[k])}</span>{" "}
                <span style={{ color: e[k] >= 0 ? C.green : C.red }}>{e[k] >= 0 ? "✓" : "✗"}</span>
              </p>
            ))}
            <p className="pt-1" style={{ color: inside ? C.green : C.red, fontWeight: 600 }}>
              {inside ? "les trois ≥ 0 : p ∈ triangle" : "une valeur < 0 : p rejeté"}
            </p>
            <p style={{ color: C.weak }}>total = edgeSide(v0, v1, v2) = 1 &gt; 0</p>
          </div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 4. Boîte englobante et balayage

const SCAN = (() => {
  const out: { i: number; j: number; e: number[]; ok: boolean }[] = [];
  for (let j = 2; j <= 6; j++)
    for (let i = 2; i <= 6; i++) {
      const e = signs([ctr(i), ctr(j)]);
      out.push({ i, j, e, ok: e.every((v) => v >= 0) });
    }
  return out;
})();
const N_LIT = SCAN.filter((c) => c.ok).length;
const sgn = (v: number) => (v >= 0 ? "+" : "−");
const BBOX_STEPS = [
  "Les 81 centres de la grille 9 × 9",
  "Boîte englobante : x et y de −0,5 à 0,5 → 25 centres",
  ...SCAN.map((c) => `(${c.i}, ${c.j}) : ${c.e.map(sgn).join(" ")} → ${c.ok ? "allumé" : "rejeté"}`),
  `Fin : ${N_LIT} pixels allumés sur 25 testés`,
];

function BboxFig() {
  const { X, Y } = frame(20, 15, 297);
  const cs = 33;
  return (
    <Stepper
      steps={BBOX_STEPS}
      interval={700}
      caption="On ne teste que les centres dans la boîte englobante : i et j de 2 à 6. Signes dans l'ordre (v0, v1), (v1, v2), (v2, v0)."
    >
      {(step) => {
        const cur = step >= 2 && step < 2 + SCAN.length ? step - 2 : -1;
        const tested = step >= 2 ? Math.min(step - 2 + 1, SCAN.length) : 0;
        const c = cur >= 0 ? SCAN[cur] : null;
        return (
          <svg viewBox="0 0 650 335" className="w-full max-w-[650px]" role="img" aria-label="Balayage de la boîte englobante">
            {Array.from({ length: 81 }, (_, k) => {
              const i = k % 9;
              const j = Math.floor(k / 9);
              const inBox = i >= 2 && i <= 6 && j >= 2 && j <= 6;
              return (
                <g key={k}>
                  <rect x={20 + i * cs} y={15 + (8 - j) * cs} width={cs} height={cs} fill={C.paper} stroke={C.line} />
                  <motion.circle cx={X(ctr(i))} cy={Y(ctr(j))} r={2.5} fill={C.weak} animate={{ opacity: step >= 1 && !inBox ? 0.15 : 1 }} />
                </g>
              );
            })}
            {SCAN.slice(0, tested).map((s, k) => (
              <motion.rect
                key={`${s.i}-${s.j}`}
                x={20 + s.i * cs + 1}
                y={15 + (8 - s.j) * cs + 1}
                width={cs - 2}
                height={cs - 2}
                fill={s.ok ? C.blue : C.weak}
                initial={{ opacity: 0 }}
                animate={{ opacity: s.ok ? 0.6 : k === cur ? [0, 0.5, 0.12] : 0.12 }}
                transition={{ duration: 0.5 }}
              />
            ))}
            {step >= 1 && (
              <motion.rect
                x={X(-0.5)}
                y={Y(0.5)}
                width={X(0.5) - X(-0.5)}
                height={Y(-0.5) - Y(0.5)}
                fill="none"
                stroke={C.orange}
                strokeWidth={2}
                strokeDasharray="6 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
            <polygon points={pts(X, Y, V)} fill="none" stroke={C.blue} strokeWidth={2} />
            {c && <motion.circle r={6} fill={C.yellow} initial={false} animate={{ cx: X(ctr(c.i)), cy: Y(ctr(c.j)) }} transition={{ duration: 0.25 }} />}

            <text x={350} y={40} fontSize={14} fill={C.ink}>
              pixels testés : {step === 0 ? 81 : 25}
            </text>
            {step >= 1 && (
              <>
                <text x={350} y={66} fontSize={13} fill={C.orange}>
                  xmin = ymin = −0,5
                </text>
                <text x={350} y={86} fontSize={13} fill={C.orange}>
                  xmax = ymax = 0,5
                </text>
              </>
            )}
            {c && (
              <>
                <text x={350} y={126} fontSize={13} fill={C.weak}>
                  centre ({c.i}, {c.j}) = ({fr(ctr(c.i))} ; {fr(ctr(c.j))})
                </text>
                {EDGES.map((ed, k) => (
                  <g key={ed.name}>
                    <text x={350} y={156 + k * 24} fontSize={13} fill={C[ed.col]}>
                      {ed.name}
                    </text>
                    <text x={540} y={156 + k * 24} fontSize={15} fill={c.e[k] >= 0 ? C.green : C.red} fontWeight={600}>
                      {sgn(c.e[k])}
                    </text>
                  </g>
                ))}
                <text x={350} y={240} fontSize={14} fill={c.ok ? C.blue : C.red} fontWeight={600}>
                  {c.ok ? "trois + : pixel allumé" : "un − : rejeté"}
                </text>
              </>
            )}
            {step >= 2 && (
              <text x={350} y={290} fontSize={13} fill={C.weak}>
                allumés : {SCAN.slice(0, tested).filter((s) => s.ok).length} / {tested} testés
              </text>
            )}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 5. Coordonnées barycentriques, et le piège

function BaryFig() {
  const [path, setPath] = useState<"v1" | "v0">("v1");
  const [t, setT] = useState(0);
  const [mode, setMode] = useState<"juste" | "faux">("juste");
  // zoom : on montre [−0,65 ; 0,68]² dans le carré de 300 px
  const { X, Y } = frame(-66.75, -63.75, 450);
  const p: P2 = path === "v1" ? [0, 0.4 * t] : [-0.5 * t, -0.5 * t];
  const good = bary(p);
  const bad: [number, number, number] = [edge(p, V[0], V[1]) / TOTAL, edge(p, V[1], V[2]) / TOTAL, edge(p, V[2], V[0]) / TOTAL];
  const lam = mode === "juste" ? good : bad;
  const barCol: Color[] = mode === "juste" ? LCOL : ["cyan", "purple", "orange"];
  const rec: P2 = [lam[0] * V[0][0] + lam[1] * V[1][0] + lam[2] * V[2][0], lam[0] * V[0][1] + lam[1] * V[1][1] + lam[2] * V[2][1]];
  const recOK = Math.hypot(rec[0] - p[0], rec[1] - p[1]) < 0.01;
  const z = lam[0] * VZ[0] + lam[1] * VZ[1] + lam[2] * VZ[2];
  const subs: P2[][] = [
    [p, V[1], V[2]],
    [p, V[2], V[0]],
    [p, V[0], V[1]],
  ];
  const BX = 370;
  const BW = 44;
  const BH = 200;
  const base = 260;
  return (
    <Figure caption="Chaque λi est l'aire du sous-triangle opposé à vi (même couleur), divisée par l'aire totale. En mode « faux », on prend l'arête qui part de vi : les poids ne redonnent plus p.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Choice
            label="trajet"
            value={path}
            onChange={(v) => {
              setPath(v);
              setT(0);
            }}
            options={[
              { value: "v1", label: "p monte vers v1" },
              { value: "v0", label: "p va sur v0" },
            ]}
          />
          <Choice
            label="appariement"
            value={mode}
            onChange={setMode}
            options={[
              { value: "juste", label: "juste" },
              { value: "faux", label: "faux (piège)" },
            ]}
          />
        </div>
        <Slider label="avancée de p" value={t} min={0} max={1} step={0.01} onChange={setT} format={(v) => `${Math.round(v * 100)} %`} />
        <svg viewBox="0 0 560 330" className="w-full max-w-[560px]" role="img" aria-label="Sous-triangles et poids barycentriques">
          <rect x={12} y={15} width={300} height={300} fill={C.paper} stroke={C.line} />
          {subs.map((s, k) => (
            <polygon key={k} points={pts(X, Y, s)} fill={C[LCOL[k]]} fillOpacity={0.28} stroke={C[LCOL[k]]} strokeWidth={1} />
          ))}
          <polygon points={pts(X, Y, V)} fill="none" stroke={C.ink} strokeWidth={1.5} />
          {["v0", "v1", "v2"].map((n, k) => (
            <text
              key={n}
              x={k === 1 ? X(V[k][0]) : k === 0 ? 18 : 306}
              y={Y(V[k][1]) + (k === 1 ? -10 : 22)}
              textAnchor={k === 1 ? "middle" : k === 0 ? "start" : "end"}
              fontSize={13}
              fill={C[LCOL[k]]}
              fontWeight={600}
            >
              {n} · z = {fr(VZ[k], 1)}
            </text>
          ))}
          <circle cx={X(rec[0])} cy={Y(rec[1])} r={10} fill="none" stroke={recOK ? C.green : C.red} strokeWidth={2} strokeDasharray={recOK ? undefined : "3 2"} />
          <circle cx={X(p[0])} cy={Y(p[1])} r={5.5} fill={C.yellow} />
          <text x={X(p[0]) + 12} y={Y(p[1]) + 4} fontSize={13} fill={C.ink}>
            p
          </text>
          {/* barres */}
          <line x1={BX - 10} y1={base} x2={BX + 3 * (BW + 22)} y2={base} stroke={C.weak} />
          <line x1={BX - 10} y1={base - BH} x2={BX + 3 * (BW + 22)} y2={base - BH} stroke={C.line} strokeDasharray="3 3" />
          <text x={BX - 14} y={base - BH + 4} textAnchor="end" fontSize={12} fill={C.weak}>
            1
          </text>
          <text x={BX - 14} y={base + 4} textAnchor="end" fontSize={12} fill={C.weak}>
            0
          </text>
          {lam.map((l, k) => {
            const h = Math.max(0, l) * BH;
            const x = BX + k * (BW + 22);
            return (
              <g key={k}>
                <rect x={x} y={base - h} width={BW} height={h} fill={C[barCol[k]]} fillOpacity={0.75} />
                <text x={x + BW / 2} y={base - h - 6} textAnchor="middle" fontSize={13} fill={C.ink}>
                  {fr(l)}
                </text>
                <text x={x + BW / 2} y={base + 18} textAnchor="middle" fontSize={13} fill={C[LCOL[k]]} fontWeight={600}>
                  λ{k}
                </text>
              </g>
            );
          })}
          <text x={BX + 90} y={base + 42} textAnchor="middle" fontSize={13} fill={C.weak}>
            somme = {fr(lam[0] + lam[1] + lam[2])}
          </text>
        </svg>
        <div className="space-y-1 font-mono text-[13.5px]">
          {mode === "juste" ? (
            <>
              <p style={{ color: C.green }}>λ0 = edgeSide(p, v1, v2) · λ1 = edgeSide(p, v2, v0) · λ2 = edgeSide(p, v0, v1) (÷ total = 1)</p>
              <p style={{ color: C.ink }}>
                p.z = {fr(lam[0])}·0,2 + {fr(lam[1])}·0,6 + {fr(lam[2])}·0,4 = <strong>{fr(z)}</strong>
              </p>
            </>
          ) : (
            <>
              <p style={{ color: C.red }}>λ0 = edgeSide(p, v0, v1) · λ1 = edgeSide(p, v1, v2) · λ2 = edgeSide(p, v2, v0) : FAUX</p>
              {!recOK && (
                <p style={{ color: C.red }}>
                  Σ λi·vi = ({fr(rec[0])} ; {fr(rec[1])}) ≠ p (cercle pointillé)
                  {Math.hypot(rec[0] - V[1][0], rec[1] - V[1][1]) < 0.01 ? " : la formule croit que p est sur v1 !" : ""}
                </p>
              )}
              <p style={{ color: C.red }}>
                z = {fr(lam[0])}·0,2 + {fr(lam[1])}·0,6 + {fr(lam[2])}·0,4 = {fr(z)} ? (juste : {fr(good[0] * VZ[0] + good[1] * VZ[1] + good[2] * VZ[2])})
              </p>
            </>
          )}
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 6. Le depth buffer : triangle A (bleu) et triangle B (orange, z = 0,1)

const U: P2[] = [
  [-0.1, -0.7],
  [0.4, 0.7],
  [0.9, -0.7],
];
const TOT_B = edge(U[0], U[1], U[2]); // 1,4
const CELLS = Array.from({ length: 81 }, (_, k) => {
  const i = k % 9;
  const j = Math.floor(k / 9);
  const p: P2 = [ctr(i), ctr(j)];
  const ea = [edge(p, V[1], V[2]), edge(p, V[2], V[0]), edge(p, V[0], V[1])];
  const eb = [edge(p, U[1], U[2]), edge(p, U[2], U[0]), edge(p, U[0], U[1])];
  const inA = ea.every((v) => v >= 0);
  const inB = eb.every((v) => v >= 0) && TOT_B > 0;
  const za = inA ? (ea[0] * VZ[0] + ea[1] * VZ[1] + ea[2] * VZ[2]) / TOTAL : null;
  const zb = inB ? 0.1 : null;
  return { i, j, za, zb };
});

type Order = "AB" | "BA";
const DEPTH_STEPS: Record<Order, string[]> = {
  AB: [
    "Depth buffer initialisé à 1,0 partout (le plus loin)",
    "On dessine A : chaque fragment passe (f.z < 1,0), depth = f.z",
    "On dessine B (z = 0,1) : 0,1 < f.z de A, B passe devant",
    "Résultat : le pixel (4, 4) n'est pas dans B, il garde 0,45",
  ],
  BA: [
    "Depth buffer initialisé à 1,0 partout (le plus loin)",
    "On dessine B : depth = 0,1 sur toute sa zone",
    "On dessine A : dans la zone commune, f.z ≥ 0,2 > 0,1, rejeté",
    "Même image et même tampon qu'avec A puis B",
  ],
};
const grey = (v: number) => {
  const g = Math.round(255 * v);
  return `rgb(${g},${g},${g})`;
};

function DepthFig() {
  const [order, setOrder] = useState<Order>("AB");
  const cs = 34;
  const IX = 20;
  const DX = 394;
  const GY = 44;
  const fI = frame(IX, GY, 9 * cs);
  const fD = frame(DX, GY, 9 * cs);
  return (
    <div className="space-y-3">
      <Choice
        label="ordre de dessin"
        value={order}
        onChange={setOrder}
        options={[
          { value: "AB", label: "A puis B" },
          { value: "BA", label: "B puis A" },
        ]}
      />
      <Stepper
        key={order}
        steps={DEPTH_STEPS[order]}
        interval={2200}
        caption="À gauche l'image, à droite le depth buffer (0 = noir, près ; 1 = blanc, loin). Règle : si f.z < depth[i][j], on dessine et depth[i][j] = f.z."
      >
        {(step) => (
          <svg viewBox="0 0 720 392" className="w-full max-w-[720px]" role="img" aria-label="Image et depth buffer">
            <defs>
              <linearGradient id="rz-depth-grad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="rgb(0,0,0)" />
                <stop offset="1" stopColor="rgb(255,255,255)" />
              </linearGradient>
            </defs>
            <text x={IX + (9 * cs) / 2} y={30} textAnchor="middle" fontSize={14} fill={C.ink}>
              image
            </text>
            <text x={DX + (9 * cs) / 2} y={30} textAnchor="middle" fontSize={14} fill={C.ink}>
              depth buffer
            </text>
            {CELLS.map((c) => {
              const drawA = c.za !== null && (order === "AB" ? step >= 1 : step >= 2);
              const drawB = c.zb !== null && (order === "AB" ? step >= 2 : step >= 1);
              // ordre réel des tests de profondeur
              let depth = 1;
              let color: Color | null = null;
              const seq: ("A" | "B")[] = order === "AB" ? ["A", "B"] : ["B", "A"];
              let rejected = false;
              for (const tri of seq) {
                const f = tri === "A" ? (drawA ? c.za : null) : drawB ? c.zb : null;
                if (f === null) continue;
                if (f < depth) {
                  depth = f;
                  color = tri === "A" ? "blue" : "orange";
                } else if (tri === "A") rejected = true;
              }
              const x = IX + c.i * cs;
              const y = GY + (8 - c.j) * cs;
              const dx = DX + c.i * cs;
              const center = c.i === 4 && c.j === 4;
              const animKey = `${color ?? "none"}-${depth}`;
              return (
                <g key={`${c.i}-${c.j}`}>
                  <rect x={x} y={y} width={cs} height={cs} fill={C.paper} stroke={C.line} />
                  {color && (
                    <motion.rect
                      key={animKey}
                      x={x + 1}
                      y={y + 1}
                      width={cs - 2}
                      height={cs - 2}
                      fill={C[color]}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ delay: (8 - c.j) * 0.08 + c.i * 0.02, duration: 0.3 }}
                    />
                  )}
                  {rejected && step === 2 && (
                    <motion.rect
                      x={x + 3}
                      y={y + 3}
                      width={cs - 6}
                      height={cs - 6}
                      fill="none"
                      stroke={C.red}
                      strokeWidth={2.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.2, 1, 0.6] }}
                      transition={{ delay: 0.3, duration: 1.6 }}
                    />
                  )}
                  <motion.rect
                    x={dx}
                    y={y}
                    width={cs}
                    height={cs}
                    initial={false}
                    animate={{ fill: grey(depth) }}
                    transition={{ delay: depth < 1 ? (8 - c.j) * 0.08 + c.i * 0.02 : 0, duration: 0.4 }}
                    stroke="rgb(128,128,128)"
                    strokeWidth={0.6}
                  />
                  <text x={dx + cs / 2} y={y + cs / 2 + 4} textAnchor="middle" fontSize={depth < 1 ? 12 : 11} fill={depth < 0.55 ? "rgb(240,240,240)" : "rgb(40,40,40)"}>
                    {depth < 1 ? fr(depth) : "1"}
                  </text>
                  {center && step === 3 && (
                    <>
                      <rect x={x + 1} y={y + 1} width={cs - 2} height={cs - 2} fill="none" stroke={C.yellow} strokeWidth={2.5} />
                      <rect x={dx + 1} y={y + 1} width={cs - 2} height={cs - 2} fill="none" stroke={C.yellow} strokeWidth={2.5} />
                    </>
                  )}
                </g>
              );
            })}
            <polygon points={pts(fI.X, fI.Y, V)} fill="none" stroke={C.blue} strokeWidth={2} />
            {(order === "AB" ? step >= 2 : step >= 1) && <polygon points={pts(fI.X, fI.Y, U)} fill="none" stroke={C.orange} strokeWidth={2} />}
            <polygon points={pts(fD.X, fD.Y, V)} fill="none" stroke={C.blue} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 3" />
            <polygon points={pts(fD.X, fD.Y, U)} fill="none" stroke={C.orange} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={IX} y={GY + 9 * cs + 22} fontSize={13} fill={C.blue}>
              A : z = 0,2 ; 0,6 ; 0,4
            </text>
            <text x={IX + 9 * cs} y={GY + 9 * cs + 22} textAnchor="end" fontSize={13} fill={C.orange}>
              B : z = 0,1
            </text>
            <rect x={DX} y={GY + 9 * cs + 12} width={9 * cs} height={10} fill="url(#rz-depth-grad)" stroke="rgb(128,128,128)" strokeWidth={0.6} />
            <text x={DX} y={GY + 9 * cs + 38} fontSize={12} fill={C.weak}>
              0 (près)
            </text>
            <text x={DX + 9 * cs} y={GY + 9 * cs + 38} textAnchor="end" fontSize={12} fill={C.weak}>
              1 (loin)
            </text>
          </svg>
        )}
      </Stepper>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Rasterisation() {
  return (
    <>
      <Section title="L'idée">
        <Idea>
          Pour chaque pixel de la boîte englobante, trois edgeSide au centre disent s'il est dans le triangle ; les mêmes valeurs donnent les
          poids qui interpolent z ; le depth buffer garde le plus proche.
        </Idea>
        <p>
          L'exercice du cours : une image de <strong>9 × 9</strong> pixels sur [−1, 1]². Le triangle v0 = (−0,5 ; −0,5), v1 = (0 ; 0,5), v2 =
          (0,5 ; −0,5), de profondeurs 0,2 ; 0,6 ; 0,4. Fil rouge : le pixel central, de centre p = (0 ; 0).
        </p>
      </Section>

      <Section title="Le centre des pixels et edgeSide">
        <p>
          On teste <strong>un seul point par pixel</strong> : son centre. Pour le pixel (i, j) : x = (i + 0,5)/w × 2 − 1 et y = (j + 0,5)/h ×
          2 − 1.
        </p>
        <PixelCenterFig />
        <p>
          edgeSide(p, v0, v1) est un produit en croix entre v0→v1 et v0→p. C'est l'<strong>aire signée</strong> du parallélogramme, soit
          deux fois l'aire du triangle (p, v0, v1). Son <strong>signe</strong> dit de quel côté de l'arête est p.
        </p>
        <EdgeSideFig />
      </Section>

      <Section title="Dedans ou dehors : trois signes et la boîte englobante">
        <p>
          On calcule les trois edgeSide en tournant dans l'ordre v0, v1, v2. p est dans le triangle si les trois sont{" "}
          <strong>≥ 0</strong>.
        </p>
        <InsideFig />
        <Note title="Le calcul en p = (0 ; 0)">
          <p>edgeSide(p, v0, v1) = (0 + 0,5)(0,5 + 0,5) − (0 + 0,5)(0 + 0,5) = 0,5 − 0,25 = 0,25</p>
          <p>edgeSide(p, v1, v2) = 0 · (−1) − (−0,5)(0,5) = 0,25</p>
          <p>edgeSide(p, v2, v0) = (−0,5) · 0 − (0,5)(−1) = 0,5</p>
          <p>Tout est positif : p est dans le triangle. Si p descend à (0 ; −0,7), seule la 3e passe négative (−0,2).</p>
        </Note>
        <p>
          Inutile de tester les 81 pixels : on se limite à la <strong>boîte englobante</strong>, du plus petit x et y au plus grand.
        </p>
        <BboxFig />
      </Section>

      <Section title="Coordonnées barycentriques : interpoler la profondeur">
        <p>
          On écrit p = λ0·v0 + λ1·v1 + λ2·v2 avec λ0 + λ1 + λ2 = 1. Le poids d'un sommet est l'<strong>aire du sous-triangle opposé</strong>,
          divisée par l'aire totale.
        </p>
        <BaryFig />
        <p>
          En p = (0 ; 0) : λ = (0,25 ; 0,5 ; 0,25), et p.z = 0,05 + 0,3 + 0,1 = <strong>0,45</strong>. Les mêmes poids interpolent la couleur
          ou la normale.
        </p>
      </Section>

      <Section title="Le depth buffer">
        <p>
          Un tableau de la taille de l'image, initialisé à <strong>1,0</strong>. Un fragment n'est dessiné que s'il est plus proche que la
          valeur stockée. Un second triangle B, plus proche (z = 0,1 partout), recouvre la droite de A.
        </p>
        <DepthFig />
      </Section>

      <Section title="Le code à connaître">
        <Formula>edgeSide(p, a, b) = (p.x − a.x)(b.y − a.y) − (p.y − a.y)(b.x − a.x)</Formula>
        <Formula>
          total = edgeSide(v0, v1, v2)
          <br />
          λ0 = edgeSide(p, v1, v2) / total
          <br />
          λ1 = edgeSide(p, v2, v0) / total
          <br />
          λ2 = edgeSide(p, v0, v1) / total
          <br />
          p.z = λ0·v0.z + λ1·v1.z + λ2·v2.z
        </Formula>
        <Code
          lang="python"
          mark={[8, 9, 10, 14, 15]}
          code={`
def edgeSide(p, a, b):
    return (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)

total = edgeSide(v0, v1, v2)                 # > 0 : triangle bien orienté
depth = [[1.0] * h for _ in range(w)]        # 1,0 = le plus loin
for (i, j) in pixels_de_la_boite_englobante:
    p = centre(i, j)                         # x = (i + 0.5) / w * 2 - 1
    e0 = edgeSide(p, v1, v2)                 # arête opposée à v0
    e1 = edgeSide(p, v2, v0)                 # arête opposée à v1
    e2 = edgeSide(p, v0, v1)                 # arête opposée à v2
    if e0 >= 0 and e1 >= 0 and e2 >= 0:      # p dans le triangle
        l0, l1, l2 = e0 / total, e1 / total, e2 / total
        z = l0 * v0.z + l1 * v1.z + l2 * v2.z
        if z < depth[i][j]:                  # test de profondeur
            depth[i][j] = z
            image[i][j] = couleur
`}
        />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Centre du pixel (i, j) : x = (i + 0,5)/w × 2 − 1, y = (j + 0,5)/h × 2 − 1.</li>
          <li>edgeSide(p, a, b) = aire signée = 2 × aire(p, a, b) ; son signe donne le côté de l'arête.</li>
          <li>p est dans le triangle si les trois edgeSide sont ≥ 0 (avec total = edgeSide(v0, v1, v2) &gt; 0).</li>
          <li>On ne teste que la boîte englobante : ici 25 centres au lieu de 81.</li>
          <li>λi = edgeSide de l'arête opposée à vi / total ; Σ λi = 1 ; attribut = Σ λi · attribut(vi).</li>
          <li>Depth buffer initialisé à 1,0 ; si f.z &lt; depth : on dessine et depth = f.z. L'ordre des triangles ne change rien.</li>
        </Points>
        <Trap>
          <p>
            <strong>λ0 ≠ edgeSide(p, v0, v1).</strong> λi vient de l'arête <strong>opposée</strong> à vi, celle qui ne touche pas vi. Avec
            l'appariement faux, on trouve z = 0,40 au lieu de 0,45.
          </p>
          <p>Vérification rapide : en p = v0, il faut λ0 = 1. Le mauvais appariement donne (0 ; 1 ; 0), comme si p était sur v1.</p>
        </Trap>
        <Trap title="Piège : l'orientation">
          <p>
            Le test « trois edgeSide ≥ 0 » suppose total = edgeSide(v0, v1, v2) &gt; 0. Ici total = (−0,5)(−1) − (−1)(0,5) = 1. Sinon, tous
            les signes s'inversent.
          </p>
        </Trap>
      </Section>

      <Section title="Questions d'examen">
        <Reveal question={<p>Image 9 × 9 sur [−1, 1]². Le pixel (4, 4) est-il dans le triangle v0, v1, v2 ? Donner ses λ et sa profondeur.</p>}>
          <p>Centre : x = y = 4,5/9 × 2 − 1 = 0, donc p = (0 ; 0).</p>
          <p>edgeSide = 0,25 ; 0,25 ; 0,5, toutes ≥ 0 (total = 1) : p est dans le triangle.</p>
          <p>λ0 = edgeSide(p, v1, v2) = 0,25 ; λ1 = edgeSide(p, v2, v0) = 0,5 ; λ2 = edgeSide(p, v0, v1) = 0,25.</p>
          <p>p.z = 0,25·0,2 + 0,5·0,6 + 0,25·0,4 = 0,05 + 0,3 + 0,1 = 0,45.</p>
        </Reveal>
        <Reveal question={<p>Combien de pixels faut-il tester pour ce triangle avec la boîte englobante ? Pourquoi est-ce correct ?</p>}>
          <p>xmin = ymin = −0,5 et xmax = ymax = 0,5.</p>
          <p>Les centres dans la boîte ont i et j de 2 à 6 : 5 × 5 = 25 pixels au lieu de 81.</p>
          <p>Un pixel hors de la boîte ne peut pas être dans le triangle, qui est contenu dans sa boîte.</p>
          <p>Ici, {N_LIT} des 25 centres passent les trois tests.</p>
        </Reveal>
        <Reveal
          question={
            <p>
              Un triangle B de profondeur 0,1 recouvre la droite de A, mais pas le pixel (4, 4). Que vaut depth[4][4] ? Que change l'ordre de
              dessin ?
            </p>
          }
        >
          <p>depth[4][4] = 0,45 : seul A couvre ce pixel.</p>
          <p>Dans la zone commune, tous les fragments de A ont f.z ≥ 0,2 &gt; 0,1 : B gagne.</p>
          <p>A puis B : B remplace A. B puis A : les fragments de A échouent au test.</p>
          <p>L'image et le tampon finaux sont les mêmes : l'ordre ne compte pas.</p>
        </Reveal>
      </Section>
    </>
  );
}
