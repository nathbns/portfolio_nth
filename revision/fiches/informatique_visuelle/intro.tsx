"use client";
// Fiche CM1 : image, couleur (RGB, CMYK, HSL), maillages (soup / indexed), scène et caméra.
// Sources : vidéo iiv-cm-00-intro (plan.json, video.srt) et README de cm1_intro.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowMarkers, C, Choice, Figure, Formula, Idea, Note, Points, Reveal, Section, Slider, Stepper, Trap, motion } from "../kit";

type V2 = [number, number];
type RGB = [number, number, number];

/** Nombre affiché à la française : 0,67 ; sans zéros inutiles. */
const fr = (x: number, d = 2) => {
  const v = Number(x.toFixed(d));
  return (v === 0 ? 0 : v).toString().replace(".", ",");
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const css = ([r, g, b]: RGB) => `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
const BTN = "row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong disabled:opacity-40";
const pts = (ps: V2[]) => ps.map((p) => p.join(",")).join(" ");

/** Générateur pseudo-aléatoire déterministe (mêmes valeurs côté serveur et client). */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// 1. De la scène à l'image (grille 8 x 6 de la vidéo)

const PIX86 = (() => {
  const out: { i: number; j: number; k: "o" | "g" | "b" }[] = [];
  for (let j = 0; j < 6; j++)
    for (let i = 0; i < 8; i++)
      out.push({ i, j, k: (i - 2) ** 2 + (j - 2.5) ** 2 <= 2.5 ? "o" : i >= 5 && i <= 6 && j >= 3 ? "g" : "b" });
  return out;
})();

function SceneToImage() {
  const [run, setRun] = useState(0);
  const sx = (x: number) => 20 + (x + 7) * 48;
  const sy = (y: number) => 125 - y * 48;
  const fill = { o: C.orange, g: C.weak, b: C.blue } as const;
  const op = { o: 0.9, g: 0.8, b: 0.2 } as const;
  const lx = sx(-3.2);
  const ly = sy(2);
  return (
    <Figure caption="Le rendering calcule la couleur de chaque pixel, ligne par ligne : la sphère devient une tache orange, le cube un bloc gris.">
      <div className="space-y-3">
        <button type="button" className={BTN} onClick={() => setRun((r) => r + 1)}>
          ↻ Rejouer
        </button>
        <svg viewBox="0 0 760 250" className="w-full max-w-[760px]" role="img" aria-label="Une scène 3D transformée en une image de 8 par 6 pixels">
          <ArrowMarkers />
          <rect x={10} y={8} width={300} height={205} fill="none" stroke={C.line} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const t = (a * Math.PI) / 180;
            return (
              <line key={a} x1={r2(lx + 14 * Math.cos(t))} y1={r2(ly + 14 * Math.sin(t))} x2={r2(lx + 20 * Math.cos(t))} y2={r2(ly + 20 * Math.sin(t))} stroke={C.yellow} strokeWidth={2} />
            );
          })}
          <circle cx={lx} cy={ly} r={10} fill={C.yellow} />
          <text x={lx + 28} y={ly + 5} fill={C.weak} fontSize={12}>
            lumière
          </text>
          <circle cx={sx(-4.5)} cy={sy(0.3)} r={38} fill={C.orange} fillOpacity={0.85} />
          <rect x={sx(-3) - 29} y={sy(-0.4) - 29} width={58} height={58} fill={C.weak} fillOpacity={0.8} />
          <text x={175} y={198} textAnchor="middle" fill={C.weak} fontSize={12}>
            objets 3D
          </text>
          <g transform={`translate(${sx(-6)} ${sy(-0.5)})`}>
            <rect x={-20} y={-11} width={26} height={22} rx={3} fill={C.ink} />
            <path d="M6 -4 L16 -10 L16 10 L6 4 Z" fill={C.ink} />
          </g>
          <text x={sx(-6)} y={sy(-0.5) + 30} textAnchor="middle" fill={C.weak} fontSize={12}>
            caméra
          </text>
          <line x1={325} y1={115} x2={455} y2={115} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
          <text x={390} y={104} textAnchor="middle" fill={C.blue} fontSize={13}>
            rendering
          </text>
          <g key={run}>
            {PIX86.map(({ i, j, k }) => (
              <motion.rect
                key={`${i}-${j}`}
                x={471 + i * 30}
                y={26 + j * 30}
                width={28}
                height={28}
                fill={fill[k]}
                initial={{ fillOpacity: 0 }}
                animate={{ fillOpacity: op[k] }}
                transition={{ delay: 0.3 + (j * 8 + i) * 0.05, duration: 0.2 }}
              />
            ))}
          </g>
          <rect x={470} y={25} width={240} height={180} fill="none" stroke={C.lineStrong} />
          <text x={160} y={238} textAnchor="middle" fill={C.ink} fontSize={13}>
            Scène
          </text>
          <text x={590} y={238} textAnchor="middle" fill={C.ink} fontSize={13}>
            Image : 8 × 6 pixels
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 2. Pixels et cube RGB (image 4 x 4 de la vidéo)

const IMG: RGB[][] = [
  [[0.9, 0.8, 0.7], [0.8, 0.6, 0.5], [0.2, 0.4, 0.6], [0.1, 0.2, 0.4]],
  [[0.9, 0.5, 0.4], [0.7, 0.3, 0.3], [0.3, 0.5, 0.7], [0.2, 0.3, 0.5]],
  [[1.0, 0.9, 0.2], [0.8, 0.7, 0.1], [0.4, 0.6, 0.3], [0.2, 0.5, 0.2]],
  [[0.6, 0.6, 0.6], [0.4, 0.4, 0.4], [0.2, 0.2, 0.2], [0.0, 0.0, 0.0]],
];

const cubeP = (r: number, g: number, b: number): V2 => [r2(560 + 160 * r - 80 * g), r2(215 + 80 * g - 176 * b)];
const bits = (n: number): RGB => [n & 1, (n >> 1) & 1, (n >> 2) & 1];
const CUBE_EDGES: [RGB, RGB][] = (() => {
  const out: [RGB, RGB][] = [];
  for (let a = 0; a < 8; a++) for (let k = 0; k < 3; k++) if (!(a & (1 << k))) out.push([bits(a), bits(a | (1 << k))]);
  return out;
})();
const CUBE_LABELS: { c: RGB; name: string; dx: number; dy: number; anchor: "start" | "middle" | "end" }[] = [
  { c: [0, 0, 0], name: "Noir", dx: -12, dy: -12, anchor: "end" },
  { c: [1, 0, 0], name: "Rouge", dx: 12, dy: 2, anchor: "start" },
  { c: [0, 1, 0], name: "Vert", dx: 0, dy: 22, anchor: "middle" },
  { c: [0, 0, 1], name: "Bleu", dx: 0, dy: -24, anchor: "middle" },
  { c: [1, 1, 0], name: "Jaune", dx: 0, dy: 22, anchor: "middle" },
  { c: [0, 1, 1], name: "Cyan", dx: -12, dy: 2, anchor: "end" },
  { c: [1, 0, 1], name: "Magenta", dx: 12, dy: 2, anchor: "start" },
  { c: [1, 1, 1], name: "Blanc", dx: 9, dy: 18, anchor: "start" },
];

function PixelCube() {
  const [sel, setSel] = useState<V2>([0, 2]);
  const col = IMG[sel[0]][sel[1]];
  const [r, g, b] = col;
  const p0 = cubeP(0, 0, 0);
  const p1 = cubeP(r, 0, 0);
  const p2 = cubeP(r, g, 0);
  const p3 = cubeP(r, g, b);
  const tr = { duration: 0.5 };
  const seg = (a: V2, z: V2, color: string) => (
    <motion.line initial={false} animate={{ x1: a[0], y1: a[1], x2: z[0], y2: z[1] }} transition={tr} stroke={color} strokeWidth={3} strokeLinecap="round" />
  );
  return (
    <Figure caption="Clique sur un pixel : ses trois nombres (R, G, B) sont les coordonnées d'un point du cube des couleurs (on avance de R, puis de G, puis de B). Image et couleur d'exemple de la vidéo.">
      <svg viewBox="0 0 800 340" className="w-full max-w-[800px]" role="img" aria-label="Image 4 par 4 et cube des couleurs RGB">
        <text x={112} y={50} textAnchor="middle" fill={C.ink} fontSize={13}>
          Tableau 2D de pixels
        </text>
        {IMG.map((row, i) =>
          row.map((c, j) => (
            <rect key={`${i}-${j}`} x={20 + j * 46} y={64 + i * 46} width={46} height={46} fill={css(c)} stroke={C.line} style={{ cursor: "pointer" }} onClick={() => setSel([i, j])} />
          )),
        )}
        <motion.rect initial={false} animate={{ x: 20 + sel[1] * 46, y: 64 + sel[0] * 46 }} transition={{ duration: 0.25 }} width={46} height={46} fill="none" stroke={C.yellow} strokeWidth={3} pointerEvents="none" />
        <rect x={240} y={90} width={90} height={90} fill={css(col)} stroke={C.lineStrong} />
        <text x={285} y={208} textAnchor="middle" fill={C.weak} fontSize={12}>
          ligne {sel[0]}, colonne {sel[1]}
        </text>
        <text x={285} y={230} textAnchor="middle" fill={C.ink} fontSize={14}>
          [{fr(r)} {fr(g)} {fr(b)}]
        </text>
        {CUBE_EDGES.map(([a, z], k) => {
          const pa = cubeP(...a);
          const pz = cubeP(...z);
          return <line key={k} x1={pa[0]} y1={pa[1]} x2={pz[0]} y2={pz[1]} stroke={C.lineStrong} strokeWidth={1.2} />;
        })}
        <text x={640} y={232} textAnchor="middle" fill={C.red} fontSize={13}>
          R
        </text>
        <text x={508} y={262} textAnchor="middle" fill={C.green} fontSize={13}>
          G
        </text>
        <text x={548} y={132} textAnchor="end" fill={C.blue} fontSize={13}>
          B
        </text>
        {CUBE_LABELS.map(({ c, name, dx, dy, anchor }) => {
          const [x, y] = cubeP(...c);
          return (
            <g key={name}>
              <circle cx={x} cy={y} r={7} fill={css(c)} stroke={C.ink} strokeWidth={1} />
              <text x={x + dx} y={y + dy} textAnchor={anchor} fill={C.ink} fontSize={12}>
                {name}
              </text>
              <text x={x + dx} y={y + dy + 14} textAnchor={anchor} fill={C.weak} fontSize={12}>
                [{c.join(" ")}]
              </text>
            </g>
          );
        })}
        {seg(p0, p1, C.red)}
        {seg(p1, p2, C.green)}
        {seg(p2, p3, C.blue)}
        <motion.circle initial={false} animate={{ cx: p3[0], cy: p3[1] }} transition={tr} r={9} fill={css(col)} stroke={C.ink} strokeWidth={2} />
      </svg>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Les cônes S, M, L (courbes approchées de la figure p. 11)

const coneS = (l: number) => Math.exp(-(((l - 445) / 22) ** 2));
const coneM = (l: number) => Math.exp(-(((l - 540) / 40) ** 2));
const coneL = (l: number) => Math.exp(-(((l - 570) / 45) ** 2));
const lamX = (l: number) => 60 + ((l - 390) / 320) * 480;
const respY = (v: number) => 205 - v * 155;
const conePath = (f: (l: number) => number) => {
  let d = "";
  for (let l = 390; l <= 710; l += 4) d += `${l === 390 ? "M" : "L"}${r2(lamX(l))},${r2(respY(f(l)))} `;
  return d;
};
const CONE_PATHS = [
  { name: "S", d: conePath(coneS), color: C.blue, lx: lamX(445) },
  { name: "M", d: conePath(coneM), color: C.green, lx: lamX(540) - 14 },
  { name: "L", d: conePath(coneL), color: C.red, lx: lamX(570) + 14 },
];
const SPECTRUM: [number, string][] = [
  [390, "#5a0090"],
  [420, "#6a00d0"],
  [445, "#2b2bff"],
  [480, "#00a0ff"],
  [500, "#00d8c0"],
  [520, "#10d810"],
  [560, "#b0f000"],
  [580, "#ffe000"],
  [600, "#ff9000"],
  [640, "#ff2000"],
  [710, "#900000"],
];

function Cones() {
  const [l, setL] = useState(550);
  const vals = [
    { name: "S", v: coneS(l), color: C.blue },
    { name: "M", v: coneM(l), color: C.green },
    { name: "L", v: coneL(l), color: C.red },
  ];
  const x = lamX(l);
  return (
    <Figure caption="Réponse des trois types de cônes (allure de la figure du cours). Les courbes se chevauchent : vers 550 nm, M et L réagissent fortement tous les deux.">
      <div className="space-y-4">
        <Slider label="Longueur d'onde λ" value={l} min={400} max={700} step={5} onChange={setL} format={(v) => `${v} nm`} />
        <svg viewBox="0 0 760 270" className="w-full max-w-[760px]" role="img" aria-label="Réponse des cônes S, M, L selon la longueur d'onde">
          <defs>
            <linearGradient id="iiv-spectre" x1="0" x2="1" y1="0" y2="0">
              {SPECTRUM.map(([nm, c]) => (
                <stop key={nm} offset={(nm - 390) / 320} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          <line x1={60} y1={205} x2={540} y2={205} stroke={C.lineStrong} />
          <line x1={60} y1={205} x2={60} y2={40} stroke={C.lineStrong} />
          <rect x={60} y={212} width={480} height={14} fill="url(#iiv-spectre)" />
          {[400, 450, 500, 550, 600, 650, 700].map((t) => (
            <text key={t} x={lamX(t)} y={244} textAnchor="middle" fill={C.weak} fontSize={12}>
              {t}
            </text>
          ))}
          <text x={300} y={264} textAnchor="middle" fill={C.weak} fontSize={12}>
            longueur d'onde (nm)
          </text>
          {CONE_PATHS.map((c) => (
            <g key={c.name}>
              <path d={c.d} fill="none" stroke={c.color} strokeWidth={2.5} />
              <text x={c.lx} y={42} textAnchor="middle" fill={c.color} fontSize={14}>
                {c.name}
              </text>
            </g>
          ))}
          <motion.line initial={false} animate={{ x1: x, x2: x }} transition={{ duration: 0.15 }} y1={30} y2={205} stroke={C.ink} strokeWidth={1.5} strokeDasharray="4 4" />
          <motion.text initial={false} animate={{ x }} transition={{ duration: 0.15 }} y={24} textAnchor="middle" fill={C.ink} fontSize={12}>
            λ = {l} nm
          </motion.text>
          {vals.map((v, k) => {
            const bx = 600 + k * 50;
            return (
              <g key={v.name}>
                <rect x={bx} y={50} width={32} height={155} fill="none" stroke={C.line} />
                <motion.rect initial={false} animate={{ y: 205 - v.v * 155, height: v.v * 155 }} transition={{ duration: 0.15 }} x={bx} width={32} fill={v.color} fillOpacity={0.75} />
                <text x={bx + 16} y={42} textAnchor="middle" fill={C.ink} fontSize={12}>
                  {fr(v.v)}
                </text>
                <text x={bx + 16} y={224} textAnchor="middle" fill={v.color} fontSize={14}>
                  {v.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 4. Gamut (diagramme de chromaticité) et synthèses additive / soustractive

const LOCUS: [number, number, number][] = [
  [380, 0.1741, 0.005],
  [460, 0.144, 0.0297],
  [470, 0.1241, 0.0578],
  [480, 0.0913, 0.1327],
  [490, 0.0454, 0.295],
  [500, 0.0082, 0.5384],
  [510, 0.0139, 0.7502],
  [520, 0.0743, 0.8338],
  [530, 0.1547, 0.8059],
  [540, 0.2296, 0.7543],
  [560, 0.3731, 0.6245],
  [580, 0.5125, 0.4866],
  [600, 0.627, 0.3725],
  [620, 0.6915, 0.3083],
  [700, 0.7347, 0.2653],
];
const chX = (x: number) => r2(60 + x * 500);
const chY = (y: number) => r2(345 - y * 350);
const LOCUS_D = LOCUS.map(([, x, y], k) => `${k ? "L" : "M"}${chX(x)},${chY(y)}`).join(" ") + " Z";
const LOCUS_LABELS: { nm: number; dx: number; dy: number; anchor: "start" | "end" }[] = [
  { nm: 460, dx: -8, dy: 4, anchor: "end" },
  { nm: 500, dx: -8, dy: 4, anchor: "end" },
  { nm: 520, dx: -6, dy: -6, anchor: "end" },
  { nm: 700, dx: 8, dy: 4, anchor: "start" },
];
const PRIM: { name: string; p: V2; color: string }[] = [
  { name: "R", p: [chX(0.64), chY(0.33)], color: "#ff0000" },
  { name: "G", p: [chX(0.3), chY(0.6)], color: "#00ff00" },
  { name: "B", p: [chX(0.15), chY(0.06)], color: "#0000ff" },
];
/** Pied de la perpendiculaire issue de chaque sommet du triangle RGB : le dégradé y passe au noir. */
const PRIM_FEET: V2[] = PRIM.map((v, k) => {
  const a = PRIM[(k + 1) % 3].p;
  const z = PRIM[(k + 2) % 3].p;
  const dx = z[0] - a[0];
  const dy = z[1] - a[1];
  const t = ((v.p[0] - a[0]) * dx + (v.p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return [r2(a[0] + t * dx), r2(a[1] + t * dy)];
});
const TRI_PTS = pts(PRIM.map((v) => v.p));

function Gamut() {
  const [run, setRun] = useState(0);
  return (
    <div className="space-y-3">
      <button type="button" className={BTN} onClick={() => setRun((k) => k + 1)}>
        ▸ Longer le bord du visible
      </button>
      <svg viewBox="0 0 520 380" className="w-full max-w-[520px]" role="img" aria-label="Diagramme de chromaticité : le triangle RGB dans le fer à cheval des couleurs visibles">
        <defs>
          {PRIM.map((v, k) => (
            <linearGradient key={v.name} id={`iiv-gam-${v.name}`} gradientUnits="userSpaceOnUse" x1={v.p[0]} y1={v.p[1]} x2={PRIM_FEET[k][0]} y2={PRIM_FEET[k][1]}>
              <stop offset={0} stopColor={v.color} />
              <stop offset={1} stopColor="#000000" />
            </linearGradient>
          ))}
        </defs>
        <line x1={60} y1={345} x2={470} y2={345} stroke={C.lineStrong} />
        <line x1={60} y1={345} x2={60} y2={25} stroke={C.lineStrong} />
        {[0, 0.2, 0.4, 0.6, 0.8].map((t) => (
          <g key={t}>
            <text x={chX(t)} y={362} textAnchor="middle" fill={C.weak} fontSize={12}>
              {fr(t, 1)}
            </text>
            <text x={52} y={chY(t) + 4} textAnchor="end" fill={C.weak} fontSize={12}>
              {fr(t, 1)}
            </text>
          </g>
        ))}
        <text x={480} y={349} fill={C.weak} fontSize={12}>
          x
        </text>
        <text x={66} y={22} fill={C.weak} fontSize={12}>
          y
        </text>
        <path d={LOCUS_D} fill={C.fill2} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
        <g style={{ isolation: "isolate" }}>
          <polygon points={TRI_PTS} fill="#000000" />
          {PRIM.map((v) => (
            <polygon key={v.name} points={TRI_PTS} fill={`url(#iiv-gam-${v.name})`} style={{ mixBlendMode: "screen" }} />
          ))}
        </g>
        <polygon points={TRI_PTS} fill="none" stroke={C.ink} strokeWidth={1} />
        {LOCUS_LABELS.map(({ nm, dx, dy, anchor }) => {
          const p = LOCUS.find((q) => q[0] === nm);
          if (!p) return null;
          return (
            <text key={nm} x={chX(p[1]) + dx} y={chY(p[2]) + dy} textAnchor={anchor} fill={C.text} fontSize={12}>
              {nm} nm
            </text>
          );
        })}
        <text x={330} y={52} fill={C.ink} fontSize={12}>
          Fer à cheval :
        </text>
        <text x={330} y={68} fill={C.weak} fontSize={12}>
          couleurs visibles
        </text>
        <text x={330} y={96} fill={C.ink} fontSize={12}>
          Triangle :
        </text>
        <text x={330} y={112} fill={C.weak} fontSize={12}>
          gamut de RGB
        </text>
        {run > 0 && (
          <motion.circle
            key={run}
            r={7}
            fill={C.yellow}
            stroke={C.ink}
            strokeWidth={1.5}
            initial={{ cx: chX(LOCUS[0][1]), cy: chY(LOCUS[0][2]) }}
            animate={{ cx: LOCUS.map((p) => chX(p[1])), cy: LOCUS.map((p) => chY(p[2])) }}
            transition={{ duration: 5, ease: "linear" }}
          />
        )}
      </svg>
    </div>
  );
}

function Synthesis() {
  const [together, setTogether] = useState(true);
  const d = together ? 30 : 72;
  const pos = (cx: number, cy: number, a: number): V2 => [r2(cx + d * Math.cos((a * Math.PI) / 180)), r2(cy + d * Math.sin((a * Math.PI) / 180))];
  const panel = (y0: number, bg: string, cols: string[], blend: "screen" | "multiply", title: string, sub: string) => (
    <g>
      <rect x={20} y={y0} width={260} height={170} fill={bg} stroke={C.line} />
      <g style={{ isolation: "isolate" }}>
        {cols.map((c, k) => {
          const [cx, cy] = pos(150, y0 + 88, -90 + k * 120);
          return <motion.circle key={c} initial={false} animate={{ cx, cy }} transition={{ duration: 0.6 }} r={50} fill={c} style={{ mixBlendMode: blend }} />;
        })}
      </g>
      <text x={150} y={y0 + 190} textAnchor="middle" fill={C.ink} fontSize={13}>
        {title}
      </text>
      <text x={150} y={y0 + 206} textAnchor="middle" fill={C.weak} fontSize={12}>
        {sub}
      </text>
    </g>
  );
  return (
    <div className="space-y-3">
      <button type="button" className={BTN} onClick={() => setTogether((t) => !t)}>
        {together ? "↔ Écarter" : "→← Superposer"}
      </button>
      <svg viewBox="0 0 300 440" className="w-full max-w-[300px]" role="img" aria-label="Synthèse additive RGB et soustractive CMY">
        {panel(0, "#000000", ["#ff0000", "#0000ff", "#00ff00"], "screen", "RGB additif", "lumières : les 3 → blanc")}
        {panel(225, "#ffffff", ["#00ffff", "#ffff00", "#ff00ff"], "multiply", "CMY soustractif", "encres : les 3 → noir")}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. Convertisseur RGB → CMYK et RGB → HSL

function toCmyk(r: number, g: number, b: number) {
  const c = 1 - r;
  const m = 1 - g;
  const y = 1 - b;
  const k = Math.min(c, m, y);
  const black = k > 1 - 1e-9;
  const s = (x: number) => (black ? 0 : (x - k) / (1 - k));
  return { c, m, y, k, black, c2: s(c), m2: s(m), y2: s(y) };
}

function toHsl(r: number, g: number, b: number) {
  const M = Math.max(r, g, b);
  const m = Math.min(r, g, b);
  const d = M - m;
  const L = (M + m) / 2;
  const grey = d < 1e-9;
  const den = 1 - Math.abs(2 * L - 1);
  const S = grey ? 0 : d / den;
  let rule: "R" | "G" | "B" | null = null;
  let inner = 0;
  let H = 0;
  if (!grey) {
    if (M === r) {
      rule = "R";
      inner = (g - b) / d;
      H = 60 * (((inner % 6) + 6) % 6);
    } else if (M === g) {
      rule = "G";
      inner = (b - r) / d;
      H = 60 * (inner + 2);
    } else {
      rule = "B";
      inner = (r - g) / d;
      H = 60 * (inner + 4);
    }
  }
  return { M, m, d, L, den, S, H, rule, inner, grey };
}

const PRESETS: { id: string; label: string; v: RGB }[] = [
  { id: "ex", label: "Exemple (0,2 0,4 0,6)", v: [0.2, 0.4, 0.6] },
  { id: "rouge", label: "Rouge", v: [1, 0, 0] },
  { id: "orange", label: "Orange", v: [1, 0.5, 0] },
  { id: "gris", label: "Gris", v: [0.5, 0.5, 0.5] },
  { id: "noir", label: "Noir", v: [0, 0, 0] },
];

const WHEEL_C: V2 = [560, 135];
const wheelPt = (rad: number, deg: number): V2 => {
  const t = (deg * Math.PI) / 180;
  return [r2(WHEEL_C[0] + rad * Math.sin(t)), r2(WHEEL_C[1] - rad * Math.cos(t))];
};
const WHEEL_SEGS = Array.from({ length: 72 }, (_, k) => {
  const a0 = k * 5;
  const a1 = a0 + 5.4;
  const o0 = wheelPt(95, a0);
  const o1 = wheelPt(95, a1);
  const i1 = wheelPt(62, a1);
  const i0 = wheelPt(62, a0);
  return { h: a0 + 2.5, d: `M${o0.join(",")} A95,95 0 0 1 ${o1.join(",")} L${i1.join(",")} A62,62 0 0 0 ${i0.join(",")} Z` };
});
const WHEEL_LABELS: { deg: number; name: string }[] = [
  { deg: 0, name: "0° rouge" },
  { deg: 60, name: "60° jaune" },
  { deg: 120, name: "120° vert" },
  { deg: 180, name: "180° cyan" },
  { deg: 240, name: "240° bleu" },
  { deg: 300, name: "300° magenta" },
];

function Bar({ x, v, color, top, h, w = 36, stroke }: { x: number; v: number; color: string; top: number; h: number; w?: number; stroke?: string }) {
  return (
    <>
      <rect x={x} y={top} width={w} height={h} fill="none" stroke={C.line} />
      <motion.rect initial={false} animate={{ y: top + h - v * h, height: v * h }} transition={{ duration: 0.25 }} x={x} width={w} fill={color} fillOpacity={stroke ? 1 : 0.8} stroke={stroke ?? "none"} />
    </>
  );
}

function ColorLab() {
  const [rgb, setRgb] = useState<RGB>([0.2, 0.4, 0.6]);
  const [r, g, b] = rgb;
  const k = toCmyk(r, g, b);
  const h = toHsl(r, g, b);
  const preset = PRESETS.find((p) => p.v.every((x, i) => Math.abs(x - rgb[i]) < 1e-9))?.id ?? "";
  const setCh = (i: number) => (v: number) => setRgb((old) => old.map((x, j) => (j === i ? v : x)) as RGB);
  const top = 50;
  const FH = 150;
  const kY = top + FH - k.k * FH;
  // Étiquettes M, L, m : espacées d'au moins 14 px.
  const yM = 210 - h.M * 160;
  const yL = 210 - h.L * 160;
  const ym = 210 - h.m * 160;
  const lM = yM + 4;
  const lL = Math.max(yL + 4, lM + 14);
  const lm = Math.max(ym + 4, lL + 14);
  const rules: { id: "R" | "G" | "B"; text: string }[] = [
    { id: "R", text: "si M = R : H = 60° × ((G − B) / (M − m) mod 6)" },
    { id: "G", text: "si M = G : H = 60° × ((B − R) / (M − m) + 2)" },
    { id: "B", text: "si M = B : H = 60° × ((R − G) / (M − m) + 4)" },
  ];
  const hslCss = `hsl(${r2(h.H)} ${r2(h.S * 100)}% ${r2(h.L * 100)}%)`;
  const cmykBars = [
    { n: "R", v: r, c: C.red, x: 30, approx: false },
    { n: "G", v: g, c: C.green, x: 80, approx: false },
    { n: "B", v: b, c: C.blue, x: 130, approx: false },
    { n: "C", v: k.c, c: C.cyan, x: 270, approx: false },
    { n: "M", v: k.m, c: C.purple, x: 320, approx: false },
    { n: "Y", v: k.y, c: C.yellow, x: 370, approx: false },
    { n: "C", v: k.c2, c: C.cyan, x: 620, approx: true },
    { n: "M", v: k.m2, c: C.purple, x: 670, approx: true },
    { n: "Y", v: k.y2, c: C.yellow, x: 720, approx: true },
    { n: "K", v: k.k, c: "#000000", x: 770, approx: false },
  ];
  return (
    <Figure caption="Bouge R, G, B ou choisis un exemple : chaque étape du calcul se met à jour. L'exemple (0,2 ; 0,4 ; 0,6) est celui de la vidéo.">
      <div className="space-y-4">
        <Choice
          label="Couleur"
          options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          value={preset}
          onChange={(id) => {
            const p = PRESETS.find((q) => q.id === id);
            if (p) setRgb(p.v);
          }}
        />
        <div className="space-y-2">
          <Slider label="R (rouge)" value={r} min={0} max={1} step={0.01} onChange={setCh(0)} format={(v) => fr(v)} />
          <Slider label="G (vert)" value={g} min={0} max={1} step={0.01} onChange={setCh(1)} format={(v) => fr(v)} />
          <Slider label="B (bleu)" value={b} min={0} max={1} step={0.01} onChange={setCh(2)} format={(v) => fr(v)} />
        </div>

        <p className="eyebrow pt-2">RGB → CMYK</p>
        <svg viewBox="0 0 860 230" className="w-full max-w-[860px]" role="img" aria-label="Conversion RGB vers CMYK en barres">
          <ArrowMarkers />
          <text x={98} y={18} textAnchor="middle" fill={C.ink} fontSize={13}>
            RGB
          </text>
          <text x={338} y={18} textAnchor="middle" fill={C.ink} fontSize={13}>
            CMY = 1 − RGB
          </text>
          <text x={713} y={18} textAnchor="middle" fill={C.ink} fontSize={13}>
            CMYK
          </text>
          {cmykBars.map((bar, i) => (
            <g key={i}>
              <Bar x={bar.x} v={bar.v} color={bar.c} top={top} h={FH} stroke={bar.n === "K" ? C.ink : undefined} />
              <text x={bar.x + 18} y={42} textAnchor="middle" fill={C.ink} fontSize={13}>
                {bar.n}
              </text>
              <text x={bar.x + 18} y={top + FH + 18} textAnchor="middle" fill={C.text} fontSize={12}>
                {bar.approx && !k.black ? "≈" : ""}
                {fr(bar.v)}
              </text>
            </g>
          ))}
          {/* le noir commun aux trois encres, sous la ligne K */}
          {[270, 320, 370].map((x) => (
            <motion.rect key={x} initial={false} animate={{ y: kY, height: top + FH - kY }} transition={{ duration: 0.25 }} x={x} width={36} fill="#000000" fillOpacity={0.6} />
          ))}
          <motion.line initial={false} animate={{ y1: kY, y2: kY }} transition={{ duration: 0.25 }} x1={262} x2={414} stroke={C.ink} strokeWidth={2} strokeDasharray="5 4" />
          <motion.text initial={false} animate={{ y: kY + 4 }} transition={{ duration: 0.25 }} x={420} fill={C.ink} fontSize={12}>
            K = {fr(k.k)}
          </motion.text>
          <line x1={180} y1={125} x2={250} y2={125} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
          <text x={215} y={115} textAnchor="middle" fill={C.blue} fontSize={12}>
            1 − x
          </text>
          <line x1={490} y1={125} x2={600} y2={125} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
          <text x={545} y={115} textAnchor="middle" fill={C.blue} fontSize={12}>
            (x − K)/(1 − K)
          </text>
          <text x={545} y={145} textAnchor="middle" fill={C.weak} fontSize={12}>
            K = min(C, M, Y)
          </text>
        </svg>
        <div className="space-y-1 font-mono text-[13.5px] text-fg-strong">
          <p>
            C = 1 − {fr(r)} = {fr(k.c)} · M = 1 − {fr(g)} = {fr(k.m)} · Y = 1 − {fr(b)} = {fr(k.y)}
          </p>
          <p>
            K = min({fr(k.c)} ; {fr(k.m)} ; {fr(k.y)}) = {fr(k.k)}
          </p>
          {k.black ? (
            <p style={{ color: C.red }}>K = 1 : 1 − K = 0, on ne divise pas. Noir pur : C = M = Y = 0.</p>
          ) : (
            <p>
              C = ({fr(k.c)} − {fr(k.k)}) / (1 − {fr(k.k)}) ≈ {fr(k.c2)} · M ≈ {fr(k.m2)} · Y ≈ {fr(k.y2)}
            </p>
          )}
          <p style={{ color: C.blue }}>
            CMYK ≈ ({fr(k.c2)} ; {fr(k.m2)} ; {fr(k.y2)} ; {fr(k.k)})
          </p>
        </div>

        <p className="eyebrow border-t border-line pt-4">RGB → HSL</p>
        <svg viewBox="0 0 860 270" className="w-full max-w-[860px]" role="img" aria-label="Conversion RGB vers HSL : max, min, lightness et roue des teintes">
          {[
            { n: "R", v: r, c: C.red, x: 40 },
            { n: "G", v: g, c: C.green, x: 90 },
            { n: "B", v: b, c: C.blue, x: 140 },
          ].map((bar) => (
            <g key={bar.n}>
              <Bar x={bar.x} v={bar.v} color={bar.c} top={50} h={160} />
              <text x={bar.x + 18} y={42} textAnchor="middle" fill={C.ink} fontSize={13}>
                {bar.n}
              </text>
              <text x={bar.x + 18} y={228} textAnchor="middle" fill={C.text} fontSize={12}>
                {fr(bar.v)}
              </text>
            </g>
          ))}
          <motion.line initial={false} animate={{ y1: yM, y2: yM }} transition={{ duration: 0.25 }} x1={32} x2={186} stroke={C.orange} strokeWidth={2} />
          <motion.line initial={false} animate={{ y1: ym, y2: ym }} transition={{ duration: 0.25 }} x1={32} x2={186} stroke={C.cyan} strokeWidth={2} />
          <motion.line initial={false} animate={{ y1: yL, y2: yL }} transition={{ duration: 0.25 }} x1={32} x2={186} stroke={C.ink} strokeWidth={2} strokeDasharray="5 4" />
          <motion.text initial={false} animate={{ y: lM }} transition={{ duration: 0.25 }} x={194} fill={C.orange} fontSize={12}>
            M = {fr(h.M)}
          </motion.text>
          <motion.text initial={false} animate={{ y: lL }} transition={{ duration: 0.25 }} x={194} fill={C.ink} fontSize={12}>
            L = {fr(h.L)}
          </motion.text>
          <motion.text initial={false} animate={{ y: lm }} transition={{ duration: 0.25 }} x={194} fill={C.cyan} fontSize={12}>
            m = {fr(h.m)}
          </motion.text>
          {WHEEL_SEGS.map((s) => (
            <path key={s.h} d={s.d} fill={`hsl(${s.h} 100% 50%)`} />
          ))}
          <circle cx={WHEEL_C[0]} cy={WHEEL_C[1]} r={52} fill={css(rgb)} stroke={C.lineStrong} />
          {WHEEL_LABELS.map(({ deg, name }) => {
            const [x, y] = wheelPt(110, deg);
            const anchor = deg === 0 || deg === 180 ? "middle" : deg < 180 ? "start" : "end";
            return (
              <text key={deg} x={x} y={y + (deg === 0 ? 0 : deg === 180 ? 10 : 4)} textAnchor={anchor} fill={C.text} fontSize={12}>
                {name}
              </text>
            );
          })}
          {!h.grey && (
            <motion.g initial={false} animate={{ rotate: h.H }} transition={{ duration: 0.5 }}>
              <circle cx={WHEEL_C[0]} cy={WHEEL_C[1]} r={100} fill="none" stroke="none" />
              <line x1={WHEEL_C[0]} y1={WHEEL_C[1] - 52} x2={WHEEL_C[0]} y2={WHEEL_C[1] - 100} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
            </motion.g>
          )}
          <text x={WHEEL_C[0]} y={WHEEL_C[1] + 5} textAnchor="middle" fill={h.L > 0.55 ? "#111111" : "#ffffff"} fontSize={14}>
            {h.grey ? "H ?" : `${fr(h.H, 0)}°`}
          </text>
          <rect x={750} y={60} width={44} height={44} fill={css(rgb)} stroke={C.lineStrong} />
          <rect x={750} y={140} width={44} height={44} fill={hslCss} stroke={C.lineStrong} />
          <text x={772} y={52} textAnchor="middle" fill={C.weak} fontSize={12}>
            RGB
          </text>
          <text x={772} y={132} textAnchor="middle" fill={C.weak} fontSize={12}>
            HSL
          </text>
          <text x={772} y={202} textAnchor="middle" fill={C.weak} fontSize={12}>
            identiques
          </text>
        </svg>
        <div className="space-y-1 font-mono text-[13.5px] text-fg-strong">
          <p>
            M = max = {fr(h.M)}
            {h.grey ? "" : ` (canal ${h.rule})`} · m = min = {fr(h.m)} · L = (M + m) / 2 = {fr(h.L)}
          </p>
          {h.grey ? (
            <p style={{ color: C.red }}>M = m : c'est un gris. S = 0 et la teinte H n'est pas définie (on diviserait par M − m = 0).</p>
          ) : (
            <p>
              S = (M − m) / (1 − |2L − 1|) = {fr(h.d)} / {fr(h.den)} = {fr(h.S)}
            </p>
          )}
          {rules.map((ru) => (
            <p key={ru.id} style={{ color: ru.id === h.rule ? C.blue : C.faint }}>
              {ru.id === h.rule ? "▸ " : "· "}
              {ru.text}
            </p>
          ))}
          {!h.grey && (
            <p>
              H = 60° × ({fr(h.inner)}
              {h.rule === "R" ? " mod 6" : h.rule === "G" ? " + 2" : " + 4"}) = {fr(h.H, 1)}°
            </p>
          )}
          <p style={{ color: C.blue }}>
            HSL = ({h.grey ? "—" : `${fr(h.H, 1)}°`} ; {fr(h.S)} ; {fr(h.L)})
          </p>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 6. Mesh : approcher une surface par des triangles

function MeshApprox() {
  const [n, setN] = useState(6);
  const cx = 480;
  const cy = 120;
  const R = 100;
  const pt = (k: number): V2 => [r2(cx + R * Math.cos((2 * Math.PI * k) / n - Math.PI / 2)), r2(cy + R * Math.sin((2 * Math.PI * k) / n - Math.PI / 2))];
  const area = ((n / 2) * Math.sin((2 * Math.PI) / n)) / Math.PI;
  return (
    <Figure caption="Plus il y a de triangles, plus le polygone colle au cercle. Le cours fait de même avec une sphère (p. 26-29).">
      <div className="space-y-4">
        <Slider label="Triangles n" value={n} min={3} max={48} onChange={setN} />
        <svg viewBox="0 0 640 270" className="w-full max-w-[640px]" role="img" aria-label="Un cercle approché par n triangles">
          <defs>
            <radialGradient id="iiv-disque" cx="0.38" cy="0.35" r="0.75">
              <stop offset={0} stopColor={C.blue} stopOpacity={0.65} />
              <stop offset={1} stopColor={C.blue} stopOpacity={0.15} />
            </radialGradient>
          </defs>
          <circle cx={120} cy={cy} r={R} fill="url(#iiv-disque)" stroke={C.blue} strokeWidth={1.5} />
          <text x={120} y={252} textAnchor="middle" fill={C.ink} fontSize={15}>
            ∫ surface lisse
          </text>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.lineStrong} strokeDasharray="4 4" />
          <motion.g key={n} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {Array.from({ length: n }, (_, k) => (
              <polygon key={k} points={pts([[cx, cy], pt(k), pt(k + 1)])} fill={C.blue} fillOpacity={k % 2 ? 0.16 : 0.34} stroke={C.blue} strokeWidth={1} strokeLinejoin="round" />
            ))}
          </motion.g>
          <text x={cx} y={252} textAnchor="middle" fill={C.ink} fontSize={15}>
            Σ triangles
          </text>
          <text x={300} y={104} textAnchor="middle" fill={C.ink} fontSize={14}>
            n = {n}
          </text>
          <text x={300} y={128} textAnchor="middle" fill={C.weak} fontSize={12}>
            aire couverte
          </text>
          <text x={300} y={146} textAnchor="middle" fill={C.ink} fontSize={14}>
            {fr(area * 100, 1)} %
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 7. Pourquoi des triangles ? (polygones de la vidéo, p. 31-34)

const tq = (x: number, y: number): V2 => [r2(330 + x * 45), r2(120 - y * 45)];
const QUAD: V2[] = [tq(-5.5, 1.5), tq(-3.6, 1.3), tq(-3.2, -1.9), tq(-6.2, -0.6)];
const PENTA: V2[] = [tq(-5.5, 1.2), tq(-4.3, 1.7), tq(-3.2, 0.2), tq(-4.3, -2.0), tq(-6.2, -0.5)];
const shift = (ps: V2[], dx: number): V2[] => ps.map(([x, y]) => [x + dx, y]);

function WhyTriangles() {
  const tints = [C.blue, C.orange, C.green];
  return (
    <Stepper
      steps={["Un quad = 2 triangles", "Un pentagone = 3 triangles", "3 points : toujours un plan, une seule normale", "4 points : pas forcément dans un même plan"]}
      interval={2600}
      caption="Deux raisons : tout polygone se découpe en triangles, et un triangle est toujours plan (une normale unique)."
    >
      {(i) => {
        if (i <= 1) {
          const poly = i === 0 ? QUAD : PENTA;
          const copy = shift(poly, 315);
          const tris = i === 0 ? [[0, 1, 2], [0, 2, 3]] : [[2, 0, 1], [2, 4, 0], [2, 3, 4]];
          const diags = i === 0 ? [[0, 2]] : [[2, 0], [2, 4]];
          return (
            <svg viewBox="0 0 640 240" className="w-full max-w-[640px]" role="img" aria-label="Découpage d'un polygone en triangles">
              <ArrowMarkers />
              <polygon points={pts(poly)} fill={C.fill2} stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
              <line x1={230} y1={130} x2={330} y2={130} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
              <g key={i}>
                {tris.map((t, k) => (
                  <motion.polygon key={k} points={pts(t.map((v) => copy[v]))} fill={tints[k]} stroke="none" initial={{ fillOpacity: 0 }} animate={{ fillOpacity: 0.3 }} transition={{ delay: 0.8 + k * 0.4, duration: 0.4 }} />
                ))}
                <polygon points={pts(copy)} fill="none" stroke={C.ink} strokeWidth={1.5} strokeLinejoin="round" />
                {diags.map(([a, z], k) => (
                  <motion.line
                    key={k}
                    x1={copy[a][0]}
                    y1={copy[a][1]}
                    x2={copy[z][0]}
                    y2={copy[z][1]}
                    stroke={C.ink}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.2 + k * 0.3, duration: 0.6 }}
                  />
                ))}
              </g>
              <text x={540} y={125} fill={C.ink} fontSize={14}>
                {i === 0 ? "2 triangles" : "3 triangles"}
              </text>
              <text x={540} y={145} fill={C.weak} fontSize={12}>
                {i === 0 ? "1 diagonale" : "2 diagonales"}
              </text>
            </svg>
          );
        }
        // Croquis plat du plan (façon p. 33-34).
        const A: V2 = [170, 160];
        const Cc: V2 = [450, 160];
        const B: V2 = [330, 108];
        const flatD = "M170,160 L270,188 L450,160 Z";
        const upD = "M170,160 L270,128 L450,160 Z";
        return (
          <svg viewBox="0 0 640 240" className="w-full max-w-[640px]" role="img" aria-label="Trois points définissent un plan ; quatre points pas forcément">
            <ArrowMarkers />
            <polygon points="90,205 230,95 560,95 420,205" fill={C.fill} stroke={C.line} strokeDasharray="5 4" />
            <text x={545} y={88} fill={C.weak} fontSize={12}>
              plan
            </text>
            <polygon points={pts([A, B, Cc])} fill={C.blue} fillOpacity={0.3} stroke={C.blue} strokeWidth={1.5} />
            {i === 2 && (
              <>
                <motion.line x1={317} y1={143} x2={317} y2={40} stroke={C.ink} strokeWidth={2} markerEnd="url(#arr-ink)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
                <text x={325} y={50} fill={C.ink} fontSize={13}>
                  normale (unique)
                </text>
              </>
            )}
            {i === 3 && (
              <>
                <motion.path fill={C.orange} fillOpacity={0.3} stroke={C.orange} strokeWidth={1.5} initial={{ d: flatD }} animate={{ d: upD }} transition={{ duration: 1.2 }} />
                <motion.line x1={270} x2={270} y1={188} stroke={C.orange} strokeDasharray="3 3" initial={{ y2: 188 }} animate={{ y2: 128 }} transition={{ duration: 1.2 }} />
                <line x1={350} y1={132} x2={350} y2={58} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
                <motion.line x1={297} y1={150} stroke={C.orange} strokeWidth={2} markerEnd="url(#arr-orange)" initial={{ x2: 297, y2: 80, opacity: 0 }} animate={{ x2: 240, y2: 92, opacity: 1 }} transition={{ delay: 0.9, duration: 0.6 }} />
                <text x={360} y={64} fill={C.ink} fontSize={13}>
                  2 triangles, 2 normales différentes
                </text>
                <motion.g initial={{ y: 0 }} animate={{ y: -60 }} transition={{ duration: 1.2 }}>
                  <circle cx={270} cy={188} r={5} fill={C.orange} />
                  <text x={254} y={193} textAnchor="end" fill={C.orange} fontSize={13}>
                    D
                  </text>
                </motion.g>
              </>
            )}
            {[
              { p: A, n: "A", dx: -16, dy: 5 },
              { p: B, n: "B", dx: 8, dy: -8 },
              { p: Cc, n: "C", dx: 10, dy: 5 },
            ].map(({ p, n, dx, dy }) => (
              <g key={n}>
                <circle cx={p[0]} cy={p[1]} r={5} fill={C.ink} />
                <text x={p[0] + dx} y={p[1] + dy} fill={C.ink} fontSize={13}>
                  {n}
                </text>
              </g>
            ))}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 8. Coordonnées barycentriques : P glissable (triangle de la vidéo, p. 35)

const BA: V2 = [-3, -2];
const BB: V2 = [3, -1.5];
const BC: V2 = [-0.5, 2.5];
const bx = (x: number) => r2(220 + x * 55);
const by = (y: number) => r2(170 - y * 55);
const area2 = (p: V2, q: V2, s: V2) => (q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]);
const BARY_PATH: V2[] = [
  [-0.17, -0.33],
  [-2.4, -1.7],
  [-0.5, 1.8],
  [0, -1.6],
  [-0.17, -0.33],
];

function Barycentric() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [P, setP] = useState<V2>([-0.17, -0.33]);
  const [drag, setDrag] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let id = 0;
    let t0 = -1;
    const legs = BARY_PATH.length - 1;
    const tick = (t: number) => {
      if (t0 < 0) t0 = t;
      const k = (t - t0) / 1100;
      if (k >= legs) {
        setP(BARY_PATH[legs]);
        setPlaying(false);
        return;
      }
      const i = Math.floor(k);
      const f = k - i;
      const e = f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f);
      const a = BARY_PATH[i];
      const z = BARY_PATH[i + 1];
      setP([a[0] + (z[0] - a[0]) * e, a[1] + (z[1] - a[1]) * e]);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  const moveTo = (e: ReactPointerEvent<SVGSVGElement>) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    if (q.x > 430) return;
    const x = Math.max(-3.8, Math.min(3.8, (q.x - 220) / 55));
    const y = Math.max(-2.6, Math.min(2.9, (170 - q.y) / 55));
    setP([x, y]);
  };

  const tot = area2(BA, BB, BC);
  const w = area2(BB, BC, P) / tot;
  const u = area2(BC, BA, P) / tot;
  const v = area2(BA, BB, P) / tot;
  const inside = w >= -1e-9 && u >= -1e-9 && v >= -1e-9;
  const s = (p: V2) => `${bx(p[0])},${by(p[1])}`;
  const weights = [
    { n: "w", val: w, c: C.green, tri: "BCP" },
    { n: "u", val: u, c: C.blue, tri: "CAP" },
    { n: "v", val: v, c: C.red, tri: "ABP" },
  ];
  return (
    <Figure caption="Glisse P (ou lance l'animation). Chaque poids est l'aire du sous-triangle coloré divisée par l'aire de ABC. Quand P va vers A, le triangle vert BCP grandit et w tend vers 1. Hors du triangle, un poids devient négatif.">
      <div className="space-y-3">
        <button type="button" className={BTN} onClick={() => setPlaying(true)} disabled={playing}>
          ▸ Animer P
        </button>
        <svg
          ref={svgRef}
          viewBox="0 0 700 320"
          className="w-full max-w-[700px] select-none"
          style={{ touchAction: "none", cursor: drag ? "grabbing" : "crosshair" }}
          role="img"
          aria-label="Coordonnées barycentriques d'un point P dans le triangle ABC"
          onPointerDown={(e) => {
            setPlaying(false);
            setDrag(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            moveTo(e);
          }}
          onPointerMove={(e) => {
            if (drag) moveTo(e);
          }}
          onPointerUp={() => setDrag(false)}
          onPointerCancel={() => setDrag(false)}
        >
          <polygon points={`${s(BB)} ${s(BC)} ${s(P)}`} fill={C.green} fillOpacity={0.25} />
          <polygon points={`${s(BC)} ${s(BA)} ${s(P)}`} fill={C.blue} fillOpacity={0.25} />
          <polygon points={`${s(BA)} ${s(BB)} ${s(P)}`} fill={C.red} fillOpacity={0.25} />
          <polygon points={`${s(BA)} ${s(BB)} ${s(BC)}`} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
          {[BA, BB, BC].map((q, k) => (
            <line key={k} x1={bx(q[0])} y1={by(q[1])} x2={bx(P[0])} y2={by(P[1])} stroke={C.weak} strokeWidth={1} strokeDasharray="3 3" />
          ))}
          <text x={bx(BA[0]) - 16} y={by(BA[1]) + 6} fill={C.ink} fontSize={15}>
            A
          </text>
          <text x={bx(BB[0]) + 8} y={by(BB[1]) + 6} fill={C.ink} fontSize={15}>
            B
          </text>
          <text x={bx(BC[0]) - 4} y={by(BC[1]) - 10} fill={C.ink} fontSize={15}>
            C
          </text>
          <circle cx={bx(P[0])} cy={by(P[1])} r={8} fill={inside ? C.ink : C.red} />
          <text x={bx(P[0]) + 11} y={by(P[1]) - 9} fill={C.ink} fontSize={14}>
            P
          </text>
          {weights.map((wt, k) => {
            const y0 = 70 + k * 56;
            const clamped = Math.max(0, Math.min(1, wt.val));
            return (
              <g key={wt.n}>
                <text x={470} y={y0 - 8} fill={wt.c} fontSize={13}>
                  {wt.n} ↔ triangle {wt.tri}
                </text>
                <rect x={470} y={y0} width={150} height={20} fill="none" stroke={C.line} />
                <rect x={470} y={y0} width={clamped * 150} height={20} fill={wt.c} fillOpacity={0.7} />
                <text x={630} y={y0 + 15} fill={wt.val < -1e-9 ? C.red : C.ink} fontSize={14}>
                  {fr(wt.val)}
                </text>
              </g>
            );
          })}
          <text x={470} y={250} fill={C.ink} fontSize={13}>
            w + u + v = {fr(w + u + v)}
          </text>
          <text x={470} y={276} fill={inside ? C.green : C.red} fontSize={13}>
            {inside ? "P dans le triangle" : "P hors du triangle"}
          </text>
          <text x={20} y={312} fill={C.ink} fontSize={13}>
            P = {fr(w)}·A + {fr(u)}·B + {fr(v)}·C
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 9. Triangle soup et indexed triangle (deux triangles de la vidéo, p. 37-40)

const sv = (x: number, y: number): V2 => [r2(470 + x * 60), r2(225 - y * 60)];
const VS: V2[] = [sv(4, 3), sv(3.8, 0.5), sv(1.5, 2.7), sv(0.5, 0.2)];
const T1 = [0, 1, 2];
const T2 = [2, 1, 3];
const centroid = (ids: number[]): V2 => [r2(ids.reduce((s, k) => s + VS[k][0], 0) / 3), r2(ids.reduce((s, k) => s + VS[k][1], 0) / 3)];

/** Petite flèche circulaire dans le sens horaire (à l'écran). */
function Clockwise({ c, marker, color }: { c: V2; marker: "blue" | "orange"; color: string }) {
  const R = 13;
  const p = (a: number) => `${r2(c[0] + R * Math.cos((a * Math.PI) / 180))},${r2(c[1] + R * Math.sin((a * Math.PI) / 180))}`;
  return <path d={`M${p(-150)} A${R},${R} 0 1 1 ${p(120)}`} fill="none" stroke={color} strokeWidth={1.8} markerEnd={`url(#arr-${marker})`} />;
}

function SoupIndexed() {
  const cellW = 66;
  return (
    <Stepper
      steps={["Soup : triangle 1 = 3 sommets, sens horaire", "Soup : le triangle 2 recopie v2 et v1", "Indexed : chaque sommet stocké une seule fois", "Indexed : indices 0,1,2 puis 2,1,3"]}
      interval={2600}
      caption="Triangle soup : une liste simple, mais avec des doublons. Indexed triangle : les sommets partagés sont désignés par leur numéro. Sommets choisis par la vidéo."
    >
      {(i) => {
        const soup = i <= 1;
        const showT2 = i >= 1;
        const soupCells = ["x0,y0", "x1,y1", "x2,y2", "x2,y2", "x1,y1", "x3,y3"];
        const idx = [0, 1, 2, 2, 1, 3];
        return (
          <svg viewBox="0 0 760 270" className="w-full max-w-[760px]" role="img" aria-label="Stockage en triangle soup et en indexed triangle">
            <ArrowMarkers />
            <line x1={460} y1={245} x2={745} y2={245} stroke={C.lineStrong} markerEnd="url(#arr-lineStrong)" />
            <line x1={460} y1={245} x2={460} y2={20} stroke={C.lineStrong} markerEnd="url(#arr-lineStrong)" />
            <text x={736} y={262} fill={C.weak} fontSize={12}>
              x
            </text>
            <text x={446} y={28} fill={C.weak} fontSize={12}>
              y
            </text>
            <polygon points={pts(T1.map((k) => VS[k]))} fill={C.blue} fillOpacity={0.22} stroke={C.blue} strokeWidth={1.5} />
            <Clockwise c={centroid(T1)} marker="blue" color={C.blue} />
            {showT2 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <polygon points={pts(T2.map((k) => VS[k]))} fill={C.orange} fillOpacity={0.22} stroke={C.orange} strokeWidth={1.5} />
                <Clockwise c={centroid(T2)} marker="orange" color={C.orange} />
              </motion.g>
            )}
            {VS.map((p, k) => {
              if (k === 3 && !showT2) return null;
              const hot = (i === 1 || i === 3) && (k === 1 || k === 2);
              const right = k <= 1;
              const dy = k === 0 || k === 2 ? -8 : 18;
              return (
                <g key={k}>
                  <circle cx={p[0]} cy={p[1]} r={hot ? 7 : 5} fill={hot ? C.red : C.ink} />
                  <text x={p[0] + (right ? 9 : -9)} y={p[1] + dy} textAnchor={right ? "start" : "end"} fill={C.ink} fontSize={13}>
                    v{k}
                  </text>
                </g>
              );
            })}
            {soup ? (
              <g>
                <text x={20} y={40} fill={C.ink} fontSize={14}>
                  Triangle soup : une seule liste
                </text>
                {soupCells.map((t, k) => {
                  if (k >= 3 && !showT2) return null;
                  const dup = (k === 3 || k === 4) && i === 1;
                  return (
                    <motion.g key={k} initial={{ opacity: 0, x: k >= 3 ? -30 : 0 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k >= 3 ? (k - 3) * 0.25 : k * 0.2, duration: 0.35 }}>
                      <rect x={20 + k * cellW} y={80} width={cellW} height={36} fill={dup ? C.red : C.fill} fillOpacity={dup ? 0.18 : 1} stroke={C.lineStrong} />
                      <text x={20 + k * cellW + cellW / 2} y={103} textAnchor="middle" fill={dup ? C.red : C.ink} fontSize={13}>
                        {t}
                      </text>
                    </motion.g>
                  );
                })}
                <path d={`M22 126 L22 132 L${18 + 3 * cellW} 132 L${18 + 3 * cellW} 126`} fill="none" stroke={C.blue} />
                <text x={20 + 1.5 * cellW} y={150} textAnchor="middle" fill={C.blue} fontSize={12}>
                  Triangle 1
                </text>
                {showT2 && (
                  <>
                    <path d={`M${22 + 3 * cellW} 126 L${22 + 3 * cellW} 132 L${18 + 6 * cellW} 132 L${18 + 6 * cellW} 126`} fill="none" stroke={C.orange} />
                    <text x={20 + 4.5 * cellW} y={150} textAnchor="middle" fill={C.orange} fontSize={12}>
                      Triangle 2
                    </text>
                    <text x={20} y={190} fill={C.red} fontSize={13}>
                      x2,y2 et x1,y1 stockés deux fois
                    </text>
                  </>
                )}
                <text x={20} y={i === 1 ? 214 : 190} fill={C.weak} fontSize={12}>
                  ordre horaire (certaines API : anti-horaire)
                </text>
              </g>
            ) : (
              <g>
                <text x={20} y={34} fill={C.ink} fontSize={14}>
                  Indexed triangle : deux listes
                </text>
                <text x={20} y={62} fill={C.weak} fontSize={12}>
                  Vertices list
                </text>
                {[0, 1, 2, 3].map((k) => {
                  const shared = i === 3 && (k === 1 || k === 2);
                  return (
                    <motion.g key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.2, duration: 0.3 }}>
                      <rect x={60 + k * 80} y={72} width={76} height={34} fill={shared ? C.red : C.fill} fillOpacity={shared ? 0.18 : 1} stroke={C.lineStrong} />
                      <text x={60 + k * 80 + 38} y={94} textAnchor="middle" fill={C.ink} fontSize={13}>
                        x{k},y{k}
                      </text>
                      <text x={60 + k * 80 + 38} y={122} textAnchor="middle" fill={C.weak} fontSize={12}>
                        {k}
                      </text>
                    </motion.g>
                  );
                })}
                {i === 2 && (
                  <text x={20} y={170} fill={C.weak} fontSize={12}>
                    4 sommets, aucun doublon
                  </text>
                )}
                {i === 3 && (
                  <g>
                    <text x={20} y={176} fill={C.weak} fontSize={12}>
                      Indices list
                    </text>
                    {idx.map((v, k) => {
                      const x = 40 + k * 56 + (k >= 3 ? 20 : 0);
                      const color = k < 3 ? C.blue : C.orange;
                      return (
                        <motion.g key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.25, duration: 0.3 }}>
                          <rect x={x} y={186} width={48} height={32} fill={C.fill} stroke={color} />
                          <text x={x + 24} y={207} textAnchor="middle" fill={color} fontSize={14}>
                            {v}
                          </text>
                          <motion.path
                            d={`M${x + 24} 184 C ${x + 24} 158, ${60 + v * 80 + 38} 152, ${60 + v * 80 + 38} 130`}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.3}
                            markerEnd={`url(#arr-${k < 3 ? "blue" : "orange"})`}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.2 + k * 0.25, duration: 0.4 }}
                          />
                        </motion.g>
                      );
                    })}
                    <text x={40 + 1.5 * 56 - 4} y={238} textAnchor="middle" fill={C.blue} fontSize={12}>
                      triangle 1
                    </text>
                    <text x={60 + 4.5 * 56 - 4} y={238} textAnchor="middle" fill={C.orange} fontSize={12}>
                      triangle 2
                    </text>
                    <text x={20} y={262} fill={C.red} fontSize={12}>
                      sommets 1 et 2 partagés : juste désignés deux fois
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 10. Combien de mémoire ? (question du cours p. 41, correction de la vidéo)

function Memory() {
  const [mode, setMode] = useState<"fan" | "grid">("fan");
  const [n, setN] = useState(6);
  const [a, setA] = useState(2);
  const T = mode === "fan" ? n : 2 * a * a;
  const V = mode === "fan" ? n + 1 : (a + 1) * (a + 1);
  const soupF = 9 * T;
  const idxF = 3 * V;
  const idxI = 3 * T;
  const scale = 380 / Math.max(soupF, idxF + idxI);

  // Maillage dessiné, et nombre de triangles qui utilisent chaque sommet.
  const tris: V2[][] = [];
  const verts: { p: V2; uses: number; label: V2 }[] = [];
  if (mode === "fan") {
    const c: V2 = [160, 130];
    const at = (k: number, rad: number): V2 => [r2(c[0] + rad * Math.cos((2 * Math.PI * k) / n - Math.PI / 2)), r2(c[1] + rad * Math.sin((2 * Math.PI * k) / n - Math.PI / 2))];
    for (let k = 0; k < n; k++) tris.push([c, at(k, 100), at(k + 1, 100)]);
    verts.push({ p: c, uses: n, label: [c[0] + 12, c[1] + 16] });
    for (let k = 0; k < n; k++) {
      const l = at(k, 118);
      verts.push({ p: at(k, 100), uses: 2, label: [l[0], l[1] + 4] });
    }
  } else {
    const s = 220 / a;
    const P = (i: number, j: number): V2 => [r2(50 + i * s), r2(20 + j * s)];
    const uses = Array.from({ length: (a + 1) * (a + 1) }, () => 0);
    for (let j = 0; j < a; j++)
      for (let i = 0; i < a; i++) {
        tris.push([P(i, j), P(i + 1, j), P(i + 1, j + 1)]);
        tris.push([P(i, j), P(i + 1, j + 1), P(i, j + 1)]);
        const used: V2[] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]];
        for (const [ii, jj] of used) uses[jj * (a + 1) + ii] += 1;
      }
    for (let j = 0; j <= a; j++)
      for (let i = 0; i <= a; i++) {
        const p = P(i, j);
        verts.push({ p, uses: uses[j * (a + 1) + i], label: [p[0] + 6, p[1] - 6] });
      }
  }
  const showUses = mode === "fan" || a <= 3;
  const tr = { duration: 0.35 };
  return (
    <Figure caption="Question du cours (p. 41), correction de la vidéo (le cours ne la donne pas). En 3D : 3 flottants par sommet, 1 entier par indice. ×k sur un sommet = nombre de copies dans la soup.">
      <div className="space-y-4">
        <Choice
          label="Maillage"
          options={[
            { value: "fan", label: "Éventail (cours p. 41)" },
            { value: "grid", label: "Grille de carrés" },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === "fan" ? (
          <Slider label="Triangles" value={n} min={3} max={12} onChange={setN} />
        ) : (
          <Slider label="Carrés par côté" value={a} min={1} max={8} onChange={setA} format={(v) => `${v} × ${v}`} />
        )}
        <svg viewBox="0 0 760 260" className="w-full max-w-[760px]" role="img" aria-label="Mémoire d'un maillage en triangle soup et en indexed triangle">
          <g key={`${mode}-${n}-${a}`}>
            {tris.map((t, k) => (
              <motion.polygon key={k} points={pts(t)} fill={C.blue} stroke={C.blue} strokeWidth={1} strokeLinejoin="round" initial={{ fillOpacity: 0 }} animate={{ fillOpacity: k % 2 ? 0.14 : 0.3 }} transition={{ delay: Math.min(k, 30) * 0.03 }} />
            ))}
          </g>
          {verts.map(({ p, uses, label }, k) => (
            <g key={k}>
              <circle cx={p[0]} cy={p[1]} r={mode === "fan" && k === 0 ? 6 : 4} fill={C.ink} />
              {showUses && (
                <text x={label[0]} y={label[1]} textAnchor={mode === "fan" && k > 0 ? "middle" : "start"} fill={uses > 2 ? C.red : C.weak} fontSize={12}>
                  ×{uses}
                </text>
              )}
            </g>
          ))}
          <text x={340} y={24} fill={C.ink} fontSize={13}>
            T = {T} triangles, V = {V} sommets
          </text>
          <text x={340} y={62} fill={C.ink} fontSize={13}>
            Soup : 3T = {3 * T} sommets stockés
          </text>
          <motion.rect initial={false} animate={{ width: soupF * scale }} transition={tr} x={340} y={72} height={28} fill={C.orange} fillOpacity={0.7} />
          <text x={340} y={118} fill={C.orange} fontSize={12}>
            {3 * T} × 3 = {soupF} flottants
          </text>
          <text x={340} y={156} fill={C.ink} fontSize={13}>
            Indexed : V = {V} sommets + 3T = {idxI} indices
          </text>
          <motion.rect initial={false} animate={{ width: idxF * scale }} transition={tr} x={340} y={166} height={28} fill={C.blue} fillOpacity={0.7} />
          <motion.rect initial={false} animate={{ x: 340 + idxF * scale, width: idxI * scale }} transition={tr} y={166} height={28} fill={C.green} fillOpacity={0.6} />
          <text x={340} y={212} fill={C.blue} fontSize={12}>
            {V} × 3 = {idxF} flottants
          </text>
          <text x={540} y={212} fill={C.green} fontSize={12}>
            + {idxI} entiers
          </text>
          <text x={340} y={246} fill={C.weak} fontSize={12}>
            valeurs stockées : soup {soupF}, indexed {idxF + idxI}
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 11. La scène : lumière → objet → caméra (p. 23-25)

function SceneLight() {
  const L: V2 = [330, 28];
  const I: V2 = [294.6, 114.6];
  const Cam: V2 = [92, 196];
  return (
    <Stepper
      steps={["Une scène : lumières, objets 3D, caméra", "La source émet la lumière", "L'objet en réfléchit une partie ; la normale donne son orientation", "La caméra mesure la lumière reçue : c'est l'image"]}
      interval={2400}
    >
      {(i) => (
        <svg viewBox="0 0 640 240" className="w-full max-w-[640px]" role="img" aria-label="Lumière émise, réfléchie par un objet et mesurée par la caméra">
          <ArrowMarkers />
          <circle cx={L[0]} cy={L[1]} r={12} fill={C.yellow} />
          <text x={L[0] + 20} y={L[1] + 5} fill={C.weak} fontSize={12}>
            source de lumière
          </text>
          <circle cx={330} cy={150} r={50} fill={C.fill2} stroke={C.ink} strokeWidth={1.5} />
          <rect x={480} y={130} width={56} height={56} fill={C.weak} fillOpacity={0.6} />
          <text x={420} y={228} textAnchor="middle" fill={C.weak} fontSize={12}>
            objets 3D
          </text>
          <g transform={`translate(${Cam[0] - 30} ${Cam[1]})`}>
            <rect x={-20} y={-12} width={28} height={24} rx={3} fill={C.ink} />
            <path d="M8 -5 L20 -12 L20 12 L8 5 Z" fill={C.ink} />
          </g>
          {i === 3 && <motion.circle cx={Cam[0] - 12} cy={Cam[1]} r={20} fill={C.yellow} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.7, 0] }} transition={{ delay: 1.2, duration: 0.9 }} />}
          <text x={Cam[0] - 36} y={Cam[1] + 32} textAnchor="middle" fill={C.weak} fontSize={12}>
            caméra
          </text>
          {i >= 1 && <motion.line x1={L[0]} y1={L[1]} x2={I[0]} y2={I[1]} stroke={C.yellow} strokeWidth={4} initial={{ pathLength: i === 1 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7 }} />}
          {i >= 2 && (
            <>
              <motion.line x1={I[0]} y1={I[1]} x2={I[0] - 42} y2={I[1] - 42} stroke={C.ink} strokeWidth={2} markerEnd="url(#arr-ink)" initial={{ opacity: i === 2 ? 0 : 1 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} />
              <text x={I[0] - 48} y={I[1] - 48} textAnchor="end" fill={C.ink} fontSize={12}>
                normale
              </text>
              <motion.line x1={I[0]} y1={I[1]} x2={Cam[0]} y2={Cam[1]} stroke={C.yellow} strokeWidth={2} initial={{ pathLength: i === 2 ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.8 }} />
            </>
          )}
          {i === 1 && <motion.circle r={5} fill={C.orange} initial={{ cx: L[0], cy: L[1] }} animate={{ cx: I[0], cy: I[1] }} transition={{ duration: 0.9 }} />}
          {i === 3 && <motion.circle r={5} fill={C.orange} initial={{ cx: I[0], cy: I[1] }} animate={{ cx: Cam[0], cy: Cam[1] }} transition={{ duration: 1.2 }} />}
          <text x={620} y={30} textAnchor="end" fill={C.ink} fontSize={13}>
            {["", "émettre", "réfléchir", "mesurer"][i]}
          </text>
        </svg>
      )}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 12. Autres représentations (p. 42-45)

/** Point du contour d'un rectangle arrondi (3 × 1,2, rayon 0,35), à l'abscisse curviligne u ∈ [0, 1). */
function roundedRectPoint(u: number): V2 {
  const w = 3;
  const h = 1.2;
  const r = 0.35;
  const sw = w - 2 * r;
  const sh = h - 2 * r;
  const arc = (Math.PI * r) / 2;
  const segs: { len: number; at: (t: number) => V2 }[] = [
    { len: sw, at: (t) => [-sw / 2 + t * sw, h / 2] },
    { len: arc, at: (t) => [sw / 2 + r * Math.sin((t * Math.PI) / 2), sh / 2 + r * Math.cos((t * Math.PI) / 2)] },
    { len: sh, at: (t) => [w / 2, sh / 2 - t * sh] },
    { len: arc, at: (t) => [sw / 2 + r * Math.cos((t * Math.PI) / 2), -sh / 2 - r * Math.sin((t * Math.PI) / 2)] },
    { len: sw, at: (t) => [sw / 2 - t * sw, -h / 2] },
    { len: arc, at: (t) => [-sw / 2 - r * Math.sin((t * Math.PI) / 2), -sh / 2 - r * Math.cos((t * Math.PI) / 2)] },
    { len: sh, at: (t) => [-w / 2, -sh / 2 + t * sh] },
    { len: arc, at: (t) => [-sw / 2 - r * Math.cos((t * Math.PI) / 2), sh / 2 + r * Math.sin((t * Math.PI) / 2)] },
  ];
  let d = u * segs.reduce((acc, sg) => acc + sg.len, 0);
  for (const sg of segs) {
    if (d <= sg.len) return sg.at(d / sg.len);
    d -= sg.len;
  }
  return segs[0].at(0);
}

const CLOUD: V2[] = (() => {
  const rnd = mulberry32(7);
  return Array.from({ length: 80 }, (_, k): V2 => {
    const [x, y] = roundedRectPoint((k + rnd() * 0.6) / 80);
    return [r2(100 + (x + (rnd() - 0.5) * 0.1) * 52), r2(125 - (y + (rnd() - 0.5) * 0.1) * 52)];
  });
})();
const VOX = (() => {
  const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < 10 && j < 10 && (i + 0.5 - 5) ** 2 + (j + 0.5 - 5) ** 2 <= 4.4 ** 2;
  const out: { i: number; j: number; edge: boolean }[] = [];
  for (let j = 0; j < 10; j++)
    for (let i = 0; i < 10; i++) if (inside(i, j)) out.push({ i, j, edge: !(inside(i - 1, j) && inside(i + 1, j) && inside(i, j - 1) && inside(i, j + 1)) });
  return out;
})();
const SPLATS: { c: V2; a: number; b: number; ang: number; col: string }[] = [
  { c: [-0.6, 0.3], a: 0.6, b: 0.25, ang: 20, col: C.blue },
  { c: [0.4, 0.5], a: 0.5, b: 0.2, ang: -30, col: C.orange },
  { c: [0, -0.3], a: 0.7, b: 0.3, ang: 0, col: C.green },
  { c: [-0.9, -0.5], a: 0.3, b: 0.15, ang: 60, col: C.purple },
  { c: [0.9, -0.2], a: 0.4, b: 0.2, ang: 80, col: C.red },
  { c: [0.2, 0.9], a: 0.35, b: 0.15, ang: 10, col: C.cyan },
];

function Representations() {
  const [run, setRun] = useState(0);
  const [c, setC] = useState(0);
  const panels = [
    { x: 10, title: "Point cloud", sub: "LiDAR, photogrammétrie" },
    { x: 200, title: "Voxels (coupe)", sub: "scanner, IRM, fumée" },
    { x: 390, title: "Surface implicite", sub: "SDF, CSG, metaballs" },
    { x: 580, title: "Gaussian splatting", sub: "ajusté sur des photos" },
  ];
  return (
    <Figure caption="Point cloud : des points 3D sans connectivité. Voxels : une grille 3D de cellules (les pixels de la 3D). Surface implicite : le zero level-set f = 0 d'une fonction, ici f = distance au centre − 1. Gaussian splatting : un nuage de gaussiennes 3D (position, forme, couleur).">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className={BTN} onClick={() => setRun((r) => r + 1)}>
            ↻ Rejouer
          </button>
          <div className="min-w-[280px] flex-1">
            <Slider label="Niveau c de f = c" value={c} min={-0.8} max={0.8} step={0.05} onChange={setC} format={(v) => fr(v)} />
          </div>
        </div>
        <svg viewBox="0 0 770 250" className="w-full max-w-[770px]" role="img" aria-label="Quatre autres représentations de la géométrie">
          <defs>
            <filter id="iiv-flou" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={4} />
            </filter>
            <clipPath id="iiv-clip-impl">
              <rect x={390} y={30} width={180} height={190} />
            </clipPath>
          </defs>
          {panels.map((p) => (
            <g key={p.title}>
              <rect x={p.x} y={30} width={180} height={190} fill="none" stroke={C.line} />
              <text x={p.x + 90} y={20} textAnchor="middle" fill={C.ink} fontSize={13}>
                {p.title}
              </text>
              <text x={p.x + 90} y={240} textAnchor="middle" fill={C.weak} fontSize={12}>
                {p.sub}
              </text>
            </g>
          ))}
          <g key={`cloud-${run}`}>
            {CLOUD.map((q, k) => (
              <motion.circle key={k} cx={q[0]} cy={q[1]} fill={C.ink} initial={{ r: 0 }} animate={{ r: 2.2 }} transition={{ delay: ((q[0] - 15) / 170) * 1.5, duration: 0.2 }} />
            ))}
          </g>
          <g key={`vox-${run}`}>
            {VOX.map(({ i, j, edge }) => (
              <motion.rect key={`${i}-${j}`} x={215 + i * 15} y={50 + j * 15} width={15} height={15} fill={C.blue} stroke={C.paper} strokeWidth={1} initial={{ fillOpacity: 0 }} animate={{ fillOpacity: edge ? 0.35 : 0.8 }} transition={{ delay: j * 0.12, duration: 0.2 }} />
            ))}
            <rect x={215} y={50} width={150} height={150} fill="none" stroke={C.lineStrong} />
          </g>
          <g clipPath="url(#iiv-clip-impl)">
            <rect x={390} y={30} width={180} height={190} fill={C.orange} fillOpacity={0.14} />
            <circle cx={480} cy={125} r={55} fill={C.blue} fillOpacity={0.22} />
            <circle cx={480} cy={125} r={55} fill="none" stroke={C.ink} strokeWidth={2.5} />
            <motion.circle cx={480} cy={125} initial={false} animate={{ r: 55 * (1 + c) }} transition={{ duration: 0.15 }} fill="none" stroke={C.purple} strokeWidth={2} strokeDasharray="5 4" />
            <text x={480} y={129} textAnchor="middle" fill={C.ink} fontSize={12}>
              f &lt; 0
            </text>
            <text x={398} y={48} fill={C.ink} fontSize={12}>
              f &gt; 0
            </text>
            <text x={562} y={212} textAnchor="end" fill={C.purple} fontSize={12}>
              f = {fr(c)}
            </text>
          </g>
          <g key={`splat-${run}`}>
            {SPLATS.map((s, k) => (
              <motion.ellipse
                key={k}
                cx={r2(670 + s.c[0] * 55)}
                cy={r2(125 - s.c[1] * 55)}
                rx={r2(s.a * 55)}
                ry={r2(s.b * 55)}
                fill={s.col}
                fillOpacity={0.75}
                filter="url(#iiv-flou)"
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: -s.ang }}
                transition={{ delay: 0.2 + k * 0.15, duration: 0.8 }}
              />
            ))}
          </g>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 13. La caméra et son frustum (vue de côté, valeurs de la vidéo, p. 47-49)

const FR_OBJ: { d: number; h: number }[] = [
  { d: 2.5, h: 0.5 },
  { d: 4, h: -1.8 },
  { d: 4.5, h: 2.5 },
  { d: 6, h: 0 },
];

function Frustum() {
  const [fov, setFov] = useState(50);
  const [near, setNear] = useState(1);
  const [far, setFar] = useState(5);
  const ox = 70;
  const oy = 170;
  const U = 62;
  const t = Math.tan((fov * Math.PI) / 360);
  const X = (d: number) => r2(ox + d * U);
  const Y = (h: number) => r2(oy - h * U);
  const inside = (o: { d: number; h: number }) => o.d >= near && o.d <= far && Math.abs(o.h) <= o.d * t;
  const visible = FR_OBJ.filter(inside).length;
  const trap = `${X(near)},${Y(near * t)} ${X(far)},${Y(far * t)} ${X(far)},${Y(-far * t)} ${X(near)},${Y(-near * t)}`;
  const ext = 7.6;
  return (
    <Figure caption="Vue de côté. Un objet est visible s'il est entre near et far et dans l'ouverture du field of view. L'objet à distance 6 reste invisible tant que far = 5, quel que soit le field of view. Valeurs de la vidéo.">
      <div className="space-y-4">
        <div className="space-y-2">
          <Slider label="Field of view" value={fov} min={20} max={110} onChange={setFov} format={(v) => `${v}°`} />
          <Slider label="Near plane" value={near} min={0.5} max={2.5} step={0.1} onChange={setNear} format={(v) => fr(v, 1)} />
          <Slider label="Far plane" value={far} min={3} max={7} step={0.1} onChange={setFar} format={(v) => fr(v, 1)} />
        </div>
        <svg viewBox="0 0 770 340" className="w-full max-w-[770px]" role="img" aria-label="Frustum de la caméra vu de côté, avec near plane, far plane et field of view">
          <ArrowMarkers />
          <defs>
            <clipPath id="iiv-clip-frustum">
              <rect x={0} y={0} width={530} height={322} />
            </clipPath>
          </defs>
          <g clipPath="url(#iiv-clip-frustum)">
            <polygon points={trap} fill={C.green} fillOpacity={0.12} />
            <line x1={ox} y1={oy} x2={X(ext)} y2={Y(ext * t)} stroke={C.lineStrong} strokeWidth={1.5} />
            <line x1={ox} y1={oy} x2={X(ext)} y2={Y(-ext * t)} stroke={C.lineStrong} strokeWidth={1.5} />
            <line x1={ox} y1={oy} x2={X(ext)} y2={oy} stroke={C.line} strokeDasharray="4 4" />
            <line x1={X(near)} y1={Y(near * t)} x2={X(near)} y2={Y(-near * t)} stroke={C.blue} strokeWidth={2.5} />
            <line x1={X(far)} y1={Y(far * t)} x2={X(far)} y2={Y(-far * t)} stroke={C.purple} strokeWidth={2.5} />
          </g>
          <text x={X(near)} y={336} textAnchor="middle" fill={C.blue} fontSize={12}>
            near
          </text>
          <text x={X(far)} y={336} textAnchor="middle" fill={C.purple} fontSize={12}>
            far
          </text>
          <text x={X((near + far) / 2)} y={oy + 20} textAnchor="middle" fill={C.green} fontSize={13}>
            frustum
          </text>
          <g transform={`translate(${ox} ${oy})`}>
            <rect x={-46} y={-12} width={28} height={24} rx={3} fill={C.ink} />
            <path d="M-18 -5 L-6 -12 L-6 12 L-18 5 Z" fill={C.ink} />
          </g>
          {FR_OBJ.map((o, k) => {
            const ok = inside(o);
            return (
              <g key={k}>
                <circle cx={X(o.d)} cy={Y(o.h)} r={9} fill={ok ? C.green : C.faint} />
                <text x={X(o.d) + 13} y={Y(o.h) + 4} fill={C.text} fontSize={12}>
                  d = {fr(o.d, 1)}
                </text>
              </g>
            );
          })}
          <text x={560} y={30} fill={C.ink} fontSize={13}>
            visibles : {visible} / 4
          </text>
          <rect x={560} y={50} width={160} height={90} fill={C.fill} stroke={C.lineStrong} />
          <text x={640} y={100} textAnchor="middle" fill={C.ink} fontSize={13}>
            16 / 9
          </text>
          <text x={560} y={160} fill={C.weak} fontSize={12}>
            aspect ratio =
          </text>
          <text x={560} y={176} fill={C.weak} fontSize={12}>
            largeur / hauteur
          </text>
          <text x={560} y={218} fill={C.ink} fontSize={13}>
            Repère de la caméra
          </text>
          <line x1={590} y1={290} x2={650} y2={290} stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" />
          <text x={656} y={294} fill={C.blue} fontSize={12}>
            Look at
          </text>
          <line x1={590} y1={290} x2={590} y2={236} stroke={C.green} strokeWidth={2} markerEnd="url(#arr-green)" />
          <text x={598} y={244} fill={C.green} fontSize={12}>
            Up
          </text>
          <circle cx={590} cy={290} r={7} fill="none" stroke={C.orange} strokeWidth={2} />
          <circle cx={590} cy={290} r={2} fill={C.orange} />
          <text x={560} y={322} fill={C.orange} fontSize={12}>
            Right (vers nous)
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------

export default function Intro() {
  return (
    <>
      <Section title="L'idée">
        <Idea>Le rendering transforme une scène (lumières, objets, caméra) en une image : un tableau de pixels RGB.</Idea>
        <p>
          L'informatique graphique, ce sont trois questions : <strong>modeling</strong> (représenter les objets), <strong>rendering</strong> (les afficher à l'écran), <strong>animation</strong> (les faire bouger).
        </p>
        <p>Ce cours porte sur le rendering. Il faut donc comprendre ce qu'est une image, puis ce qu'est une scène.</p>
        <SceneToImage />
      </Section>

      <Section title="Une image : des pixels RGB">
        <p>Une image est un tableau 2D de pixels. Chaque pixel stocke trois nombres entre 0 et 1 : la quantité de rouge, de vert et de bleu.</p>
        <p>
          Ces trois axes forment le <strong>cube des couleurs</strong> : noir en (0, 0, 0), blanc en (1, 1, 1).
        </p>
        <PixelCube />
        <p>
          Pourquoi rouge, vert, bleu ? Dans l'œil, les <strong>bâtonnets</strong> mesurent l'intensité et les <strong>cônes</strong> la couleur. Il existe trois types de cônes : S, M et L.
        </p>
        <Cones />
        <Note title="Repère du cours">
          <p>La photo couleur date de 1926, trente ans avant la découverte des cônes (1956).</p>
        </Note>
        <p>
          RGB ne représente pas toutes les couleurs visibles. Le <strong>gamut</strong> est le sous-ensemble des couleurs atteignables par une représentation.
        </p>
        <Figure caption="À gauche : le triangle RGB ne couvre qu'une partie du fer à cheval des couleurs visibles (diagramme de chromaticité). À droite : RGB est une synthèse additive (on ajoute des lumières), CMY une synthèse soustractive (on superpose des encres).">
          <div className="grid items-start gap-6 md:grid-cols-[1.7fr_1fr]">
            <Gamut />
            <Synthesis />
          </div>
        </Figure>
      </Section>

      <Section title="Convertir : RGB → CMYK et RGB → HSL">
        <p>
          CMY est le complément de RGB : <code>C = 1 − R</code>, <code>M = 1 − G</code>, <code>Y = 1 − B</code>.
        </p>
        <p>
          K (le noir) mesure à quel point la couleur est sombre, quelle que soit sa teinte : <code>K = min(C, M, Y)</code>. On retire ce noir des trois encres, puis on divise par <code>1 − K</code>.
        </p>
        <p>
          HSL décrit la couleur pour un artiste : la teinte <strong>H</strong> (la couleur elle-même), la saturation <strong>S</strong> (sa vivacité), la lightness <strong>L</strong> (l'équilibre noir / blanc).
        </p>
        <ColorLab />
        <Note title="Autres représentations de la couleur (p. 19-21)">
          <p>
            <strong>CIELAB</strong> : L la luminosité, a de vert à rouge, b de bleu à jaune. Des distances égales y donnent à peu près des écarts de couleur perçus égaux.
          </p>
          <p>
            <strong>HSV</strong> : comme HSL, mais la value V règle la luminosité. Une caméra passe par plusieurs encodages : Raw → Log → Rec709.
          </p>
        </Note>
      </Section>

      <Section title="Des triangles pour décrire les surfaces">
        <p>
          Un <strong>mesh</strong> approche une surface par des triangles. On passe d'une intégrale sur une surface lisse à une somme sur des triangles.
        </p>
        <MeshApprox />
        <p>Pourquoi des triangles, et pas des quads ou des cercles ?</p>
        <WhyTriangles />
        <p>
          Dans un triangle ABC, tout point P s'écrit <code>P = wA + uB + vC</code> : ce sont ses <strong>coordonnées barycentriques</strong>. Chaque poids est un rapport d'aires : w avec BCP, u avec CAP, v avec ABP.
        </p>
        <Barycentric />
      </Section>

      <Section title="Stocker un mesh : soup ou indexed">
        <p>
          <strong>Triangle soup</strong> : chaque triangle stocke ses 3 sommets, dans l'ordre horaire. Les sommets partagés sont recopiés.
        </p>
        <p>
          <strong>Indexed triangle</strong> : une liste de sommets, chacun une seule fois, plus une liste d'indices, 3 par triangle.
        </p>
        <SoupIndexed />
        <p>Question du cours : combien de mémoire pour chacun ? Fais varier le maillage.</p>
        <Memory />
      </Section>

      <Section title="La scène : objets, lumière, caméra">
        <p>Une scène contient des sources de lumière, des objets 3D et une caméra. La source émet, l'objet réfléchit une partie de la lumière, la caméra la mesure.</p>
        <SceneLight />
        <p>Le mesh n'est pas la seule façon de représenter un objet. Le cours en cite quatre autres.</p>
        <Representations />
        <p>
          La caméra a une position (x, y, z) et son propre repère : <strong>Up</strong>, <strong>Right</strong>, <strong>Look at</strong>. Le <strong>frustum</strong> est la partie visible de la scène : entre le near plane et le far plane, ouvert par le field of view.
        </p>
        <Frustum />
        <p>Near plane, far plane, aspect ratio et field of view sont la base du vertex shader (CM2).</p>
      </Section>

      <Section title="Les formules à connaître">
        <p className="eyebrow">RGB → CMYK</p>
        <Formula>
          C = 1 − R &nbsp; M = 1 − G &nbsp; Y = 1 − B &nbsp;&nbsp;·&nbsp;&nbsp; K = min(C, M, Y)
          <br />
          C ← (C − K) / (1 − K), idem pour M et Y &nbsp;&nbsp;·&nbsp;&nbsp; si K = 1 : C = M = Y = 0
        </Formula>
        <p className="eyebrow">RGB → HSL (R, G, B dans [0, 1])</p>
        <Formula>
          M = max(R, G, B) &nbsp; m = min(R, G, B) &nbsp;&nbsp;·&nbsp;&nbsp; L = (M + m) / 2
          <br />
          S = 0 si M = m, sinon S = (M − m) / (1 − |2L − 1|)
          <br />
          M = R : H = 60° × ((G − B)/(M − m) mod 6)
          <br />
          M = G : H = 60° × ((B − R)/(M − m) + 2)
          <br />
          M = B : H = 60° × ((R − G)/(M − m) + 4)
        </Formula>
        <p className="eyebrow">Barycentriques et mémoire</p>
        <Formula>
          P = wA + uB + vC &nbsp; avec w + u + v = 1 &nbsp;&nbsp;·&nbsp;&nbsp; w = aire(BCP) / aire(ABC)
          <br />
          T triangles, V sommets : soup = 3T sommets &nbsp;·&nbsp; indexed = V sommets + 3T indices
        </Formula>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Image = tableau 2D de pixels ; pixel = (R, G, B) dans [0, 1] ; noir (0, 0, 0), blanc (1, 1, 1).</li>
          <li>Œil : bâtonnets → intensité, trois cônes S, M, L → couleur. Leurs courbes se chevauchent.</li>
          <li>Gamut = couleurs atteignables. RGB (additif) ne couvre pas tout le visible. CMY est soustractif.</li>
          <li>Triangles : tout polygone s'y découpe, et 3 points donnent toujours un plan, donc une normale unique.</li>
          <li>P = wA + uB + vC : poids = rapports d'aires, positifs dans le triangle, de somme 1.</li>
          <li>Soup : 3 sommets par triangle, avec doublons. Indexed : sommets uniques + 3 indices par triangle.</li>
          <li>Caméra : position + repère (Up, Right, Look at). Frustum entre near et far, ouvert par le field of view ; aspect ratio = largeur / hauteur.</li>
        </Points>
        <Trap>
          <p>« Un cône pour le rouge, un pour le vert, un pour le bleu » : c'est barré dans le cours. Les trois courbes S, M, L se chevauchent.</p>
        </Trap>
        <Trap title="Piège de calcul">
          <p>CMYK : ne pas s'arrêter à 1 − RGB. Il faut retirer K puis diviser par 1 − K. Si K = 1 (noir pur), on ne divise pas : C = M = Y = 0.</p>
          <p>HSL : le « mod 6 » ne sert que si le max est R. Si M = m (un gris), S = 0 et la teinte n'est pas définie.</p>
        </Trap>
        <Reveal question={<p>Convertir la couleur RGB = (0,2 ; 0,4 ; 0,6) en CMYK, puis en HSL.</p>}>
          <p>
            <strong>CMYK.</strong> C = 0,8, M = 0,6, Y = 0,4. K = min = 0,4. C = (0,8 − 0,4) / 0,6 ≈ 0,67 ; M = 0,2 / 0,6 ≈ 0,33 ; Y = 0. Donc CMYK ≈ (0,67 ; 0,33 ; 0 ; 0,4).
          </p>
          <p>
            <strong>HSL.</strong> M = 0,6 (B), m = 0,2. L = 0,4. S = 0,4 / (1 − |0,8 − 1|) = 0,4 / 0,8 = 0,5. Max = B : H = 60° × ((0,2 − 0,4) / 0,4 + 4) = 60° × 3,5 = 210°. Donc HSL = (210° ; 0,5 ; 0,4).
          </p>
        </Reveal>
        <Reveal question={<p>Un maillage en éventail a 6 triangles et 7 sommets (un au centre). Estimer sa mémoire en triangle soup et en indexed triangle, en 3D.</p>}>
          <p>Soup : 6 × 3 = 18 sommets stockés (le centre recopié 6 fois, chaque sommet du bord 2 fois), soit 18 × 3 = 54 flottants.</p>
          <p>Indexed : 7 sommets × 3 = 21 flottants, plus 6 × 3 = 18 indices entiers.</p>
          <p>Plus les sommets sont partagés, plus l'indexed est avantageux. (Correction de la vidéo : le cours ne la donne pas.)</p>
        </Reveal>
        <Reveal question={<p>Pourquoi représenter les surfaces par des triangles plutôt que par des quads ?</p>}>
          <p>Tout polygone se découpe en triangles : un quad en 2, un pentagone en 3.</p>
          <p>Trois points définissent toujours un plan, donc une normale unique sur tout le triangle. Quatre points ne sont pas forcément dans un même plan : le quad peut être plié.</p>
        </Reveal>
      </Section>
    </>
  );
}
