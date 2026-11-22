"use client";
// Fiche : le vol de travail (TP « Le vol de travail en Go », image de Mandelbrot).
// Les mesures viennent du TP (Mac, 12 cœurs). Les images, chronos et parcours
// sont des illustrations calculées ici, de façon déterministe.
import { useMemo, useState } from "react";
import {
  AnimatePresence,
  ArrowMarkers,
  C,
  Choice,
  Code,
  Figure,
  Idea,
  Note,
  Points,
  Reveal,
  Section,
  Slider,
  Stepper,
  Trap,
  motion,
} from "../kit";

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

const PAL = [C.blue, C.orange, C.green, C.purple, C.cyan, C.yellow] as const;
const couleur = (w: number) => PAL[w % PAL.length];
const fr = (x: number, d = 2) => x.toFixed(d).replace(".", ",");
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Apparition d'un trait ou d'un texte SVG après `apres` secondes (attributs, animés en JS). */
const apparitionTrait = (apres: number) => ({
  initial: { strokeOpacity: 0 },
  animate: { strokeOpacity: 1 },
  transition: { delay: apres, duration: 0.25 },
});
const apparitionTexte = (apres: number) => ({
  initial: { fillOpacity: 0 },
  animate: { fillOpacity: 1 },
  transition: { delay: apres, duration: 0.25 },
});

// Grille d'illustration : 32 × 32 cases sur le carré [-2, 2] × [-2, 2] du TP
// (le TP a 64 × 64 rectangles de 32 × 32 pixels).
const N = 32;
const ITER = 5000;
const SURCOUT = 20; // coût fixe d'une case, en plus de ses itérations

function echappement(cr: number, ci: number): number {
  let zr = 0;
  let zi = 0;
  let n = 0;
  while (n < ITER && zr * zr + zi * zi <= 4) {
    const t = zr * zr - zi * zi + cr;
    zi = 2 * zr * zi + ci;
    zr = t;
    n++;
  }
  return n;
}

function grilleCouts(): number[] {
  const g: number[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) g.push(echappement(-2 + ((c + 0.5) * 4) / N, 2 - ((r + 0.5) * 4) / N));
  }
  return g;
}

const intensite = (k: number) => r3(Math.log(1 + k) / Math.log(1 + ITER));
const bandeDeLigne = (r: number, p: number) => Math.floor(((r + 0.5) * p) / N);

/** Suite pseudo-aléatoire fixe (mulberry32) : même tirage au serveur et au client. */
function prng(graine: number) {
  let a = graine;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Repartition {
  qui: number[]; // goroutine qui a calculé chaque case
  fins: number[]; // instant de fin de chaque goroutine
  vols: number;
}

function simBlocs(cout: number[], p: number): Repartition {
  const qui: number[] = [];
  const fins = new Array<number>(p).fill(0);
  cout.forEach((k, idx) => {
    const w = bandeDeLigne(Math.floor(idx / N), p);
    qui.push(w);
    fins[w] += k + SURCOUT;
  });
  return { qui, fins, vols: 0 };
}

/** Version vol : paquets contigus au départ, puis vol chez une victime tirée au hasard. */
function simVol(cout: number[], p: number): Repartition {
  const L = N * N;
  const files: number[][] = Array.from({ length: p }, () => []);
  for (let k = 0; k < L; k++) files[Math.floor((k * p) / L)].push(k);
  const tete = new Array<number>(p).fill(0);
  const t = new Array<number>(p).fill(0);
  const fini = new Array<boolean>(p).fill(false);
  const qui = new Array<number>(L).fill(0);
  const hasard = prng(2026);
  let restants = L;
  let vols = 0;
  for (;;) {
    let w = -1;
    for (let i = 0; i < p; i++) if (!fini[i] && (w < 0 || t[i] < t[w])) w = i;
    if (w < 0) break;
    if (restants === 0) {
      fini[w] = true;
      continue;
    }
    let k: number;
    if (tete[w] < files[w].length) k = files[w][tete[w]++];
    else {
      let j = Math.floor(hasard() * (p - 1));
      if (j >= w) j++;
      if (tete[j] < files[j].length) {
        k = files[j][tete[j]++];
        vols++;
      } else {
        t[w] += 1; // échec : on réessaie un peu plus tard
        continue;
      }
    }
    restants--;
    qui[k] = w;
    t[w] += cout[k] + SURCOUT;
  }
  return { qui, fins: t, vols };
}

// Mesures du TP (Mac, 12 cœurs : 8 performance + 4 économes), en secondes.
const T_SEQ = 4.05;
const NATIF = [4.0507, 2.0721, 1.5241, 1.1497, 0.9007, 0.7473, 0.6642, 0.5834, 0.5469, 0.5158, 0.4875, 0.4636];
const BLOCS = [4.0457, 2.0732, 3.8891, 2.0753, 2.9557, 1.9961, 2.3752, 1.7543, 1.9653, 1.536, 1.6672, 1.3611];

// ---------------------------------------------------------------------------
// Figure : le coût de chaque case
// ---------------------------------------------------------------------------

function CarteCouts({ cout }: { cout: number[] }) {
  const lignes = useMemo(() => {
    const l = new Array<number>(N).fill(0);
    cout.forEach((k, idx) => {
      l[Math.floor(idx / N)] += k + SURCOUT;
    });
    return l;
  }, [cout]);
  const total = lignes.reduce((a, b) => a + b, 0);
  const maxL = Math.max(...lignes);
  const milieu = lignes.slice(12, 20).reduce((a, b) => a + b, 0) / total;
  const IX = 30;
  const IY = 30;
  const CEL = 8;
  const BX = 330;
  const BW = 250;
  return (
    <svg viewBox="0 0 720 300" className="w-full max-w-[720px]" role="img" aria-label="Coût de calcul de chaque case de l'image de Mandelbrot, et coût de chaque ligne de cases">
      <text x={IX} y={20} fill={C.weak} fontSize={12}>
        {"image : 1 case = 1 rectangle"}
      </text>
      {cout.map((k, idx) => (
        <rect
          key={idx}
          x={IX + (idx % N) * CEL}
          y={IY + Math.floor(idx / N) * CEL}
          width={CEL}
          height={CEL}
          fill={C.ink}
          fillOpacity={r3(0.04 + 0.9 * intensite(k))}
        />
      ))}
      <rect x={IX} y={IY} width={N * CEL} height={N * CEL} fill="none" stroke={C.lineStrong} />
      <text x={BX} y={20} fill={C.weak} fontSize={12}>
        {"coût de chaque ligne de cases"}
      </text>
      {lignes.map((l, r) => (
        <motion.rect
          key={r}
          x={BX}
          y={IY + r * CEL + 1}
          height={CEL - 2}
          fill={C.orange}
          fillOpacity={0.7}
          initial={{ width: 0 }}
          animate={{ width: r3((BW * l) / maxL) }}
          transition={{ duration: 0.6, delay: r * 0.02 }}
        />
      ))}
      <line x1={BX} y1={IY} x2={BX} y2={IY + N * CEL} stroke={C.lineStrong} />
      <path d={`M ${BX + BW + 10} ${IY + 12 * CEL} h 8 V ${IY + 20 * CEL} h -8`} fill="none" stroke={C.text} strokeWidth={1.5} />
      <text x={BX + BW + 24} y={IY + 15 * CEL} fill={C.ink} fontSize={13}>
        {"8 lignes"}
      </text>
      <text x={BX + BW + 24} y={IY + 15 * CEL + 17} fill={C.ink} fontSize={13}>
        {"du milieu :"}
      </text>
      <text x={BX + BW + 24} y={IY + 15 * CEL + 34} fill={C.orange} fontSize={14} fontWeight={600}>
        {`${Math.round(milieu * 100)} % du coût`}
      </text>
      <text x={BX + 6} y={IY + 3 * CEL} fill={C.weak} fontSize={12}>
        {"haut : presque rien"}
      </text>
      <text x={BX + 6} y={IY + 30 * CEL} fill={C.weak} fontSize={12}>
        {"bas : presque rien"}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Figure : bandes fixes (blocs) ou vol de travail, avec un chrono
// ---------------------------------------------------------------------------

function BlocsOuVol({ cout }: { cout: number[] }) {
  const [p, setP] = useState(3);
  const [mode, setMode] = useState<"blocs" | "vol">("blocs");
  const [tour, setTour] = useState(0);
  const blocs = useMemo(() => simBlocs(cout, p), [cout, p]);
  const vol = useMemo(() => simVol(cout, p), [cout, p]);
  const total = useMemo(() => cout.reduce((a, k) => a + k + SURCOUT, 0), [cout]);
  const rep = mode === "blocs" ? blocs : vol;
  const echelle = Math.max(...blocs.fins);
  const fin = Math.max(...rep.fins);
  const IX = 16;
  const IY = 30;
  const CEL = 8;
  const S = N * CEL;
  const BX = 336;
  const BW = 364;
  const D = 3; // durée du chrono pour la fin de blocs, en secondes
  const rangees = Array.from({ length: p }, (_, i) => {
    let a = N;
    let b = -1;
    for (let r = 0; r < N; r++) {
      if (bandeDeLigne(r, p) === i) {
        a = Math.min(a, r);
        b = Math.max(b, r);
      }
    }
    return { a, b };
  });
  const xFin = (BW * fin) / echelle;
  return (
    <Figure
      caption={
        <>
          Bouger p, puis passer de blocs à vol. Couleur = goroutine qui a calculé la case. Barre pleine = travail ;
          pointillés = attente. Simulation d&apos;illustration (grille 32 × 32), pas les mesures.
        </>
      }
    >
      <div className="space-y-3">
        <Slider label="p (goroutines)" value={p} min={1} max={12} onChange={setP} />
        <div className="flex flex-wrap items-center gap-3">
          <Choice
            label="Version"
            value={mode}
            onChange={setMode}
            options={[
              { value: "blocs", label: "blocs : bandes fixes" },
              { value: "vol", label: "vol de travail" },
            ]}
          />
          <button
            type="button"
            onClick={() => setTour((t) => t + 1)}
            className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
          >
            ↻ relancer le chrono
          </button>
        </div>
        <svg viewBox="0 0 720 312" className="w-full max-w-[720px]" role="img" aria-label="Image coupée en bandes ou répartie par vol de travail, et chrono de fin de chaque goroutine">
          <text x={IX} y={20} fill={C.weak} fontSize={12}>
            {"image (illustration)"}
          </text>
          <text x={BX} y={20} fill={C.weak} fontSize={12}>
            {"chrono : quand chaque goroutine finit"}
          </text>
          {cout.map((k, idx) => (
            <rect
              key={idx}
              x={IX + (idx % N) * CEL}
              y={IY + Math.floor(idx / N) * CEL}
              width={CEL}
              height={CEL}
              fill={couleur(rep.qui[idx])}
              fillOpacity={r3(0.14 + 0.86 * intensite(k))}
            />
          ))}
          {mode === "blocs" &&
            rangees.slice(1).map((g, i) => (
              <line key={i} x1={IX} x2={IX + S} y1={IY + g.a * CEL} y2={IY + g.a * CEL} stroke={C.ink} strokeWidth={1.2} />
            ))}
          <rect x={IX} y={IY} width={S} height={S} fill="none" stroke={C.lineStrong} />
          <g key={`${mode}-${p}-${tour}`}>
            {rep.fins.map((f, i) => {
              const g = rangees[i];
              const y = IY + ((g.a + g.b + 1) / 2) * CEL;
              const h = Math.min(14, (g.b - g.a + 1) * CEL - 4);
              const w = r3((BW * f) / echelle);
              const d = (D * f) / echelle;
              return (
                <g key={i}>
                  <text x={BX - 8} y={y + 4} textAnchor="end" fill={C.text} fontSize={12}>
                    {`g${i}`}
                  </text>
                  <rect x={BX} y={y - h / 2} width={BW} height={h} fill={C.fill} />
                  <motion.rect
                    x={BX}
                    y={y - h / 2}
                    height={h}
                    fill={couleur(i)}
                    fillOpacity={0.7}
                    initial={{ width: 0 }}
                    animate={{ width: w }}
                    transition={{ duration: d, ease: "linear" }}
                  />
                  {xFin - w > 3 && (
                    <motion.rect
                      x={BX + w}
                      y={y - h / 2 + 1}
                      width={r3(xFin - w)}
                      height={h - 2}
                      fill="none"
                      stroke={C.weak}
                      strokeDasharray="3 3"
                      {...apparitionTrait(d)}
                    />
                  )}
                </g>
              );
            })}
            <motion.g initial={{ x: 0 }} animate={{ x: xFin }} transition={{ duration: (D * fin) / echelle, ease: "linear" }}>
              <line x1={BX} x2={BX} y1={IY - 4} y2={IY + S + 4} stroke={C.red} strokeWidth={1.5} />
            </motion.g>
            <motion.text
              x={BX + xFin}
              y={IY + S + 18}
              textAnchor="middle"
              fill={C.red}
              fontSize={12}
              {...apparitionTexte((D * fin) / echelle)}
            >
              {"fin"}
            </motion.text>
          </g>
          <text x={BX} y={IY + S + 18} fill={C.weak} fontSize={12}>
            {"0"}
          </text>
        </svg>
        <p className="font-mono text-[13px] leading-relaxed text-fg-weak">
          {mode === "blocs" ? (
            <>
              Illustration : fin à <span className="text-fg-strong">{fr((100 * fin) / total, 1)} %</span> du temps
              séquentiel, accélération ≈ {fr(total / fin, 1)}. Mesuré : blocs{" "}
              <span className="text-fg-strong">{fr(BLOCS[p - 1])} s</span>, natif {fr(NATIF[p - 1])} s (séquentiel 4,05 s).
            </>
          ) : (
            <>
              Illustration : fin à <span className="text-fg-strong">{fr((100 * fin) / total, 1)} %</span> du temps
              séquentiel (idéal : {fr(100 / p, 1)} %), {vol.vols} vols. Mesuré à p = 12 : vol 0,464 s, comme natif.
            </>
          )}
        </p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Figure : courbes d'accélération mesurées
// ---------------------------------------------------------------------------

function Courbes() {
  const [p, setP] = useState(3);
  const X0 = 64;
  const X1 = 690;
  const Y0 = 262;
  const Y1 = 30;
  const xs = (q: number) => X0 + ((q - 1) * (X1 - X0)) / 11;
  const ys = (a: number) => Y0 - (a * (Y0 - Y1)) / 12;
  const acc = (t: number) => T_SEQ / t;
  const chemin = (ts: number[]) => ts.map((t, k) => `${k === 0 ? "M" : "L"} ${r3(xs(k + 1))} ${r3(ys(acc(t)))}`).join(" ");
  return (
    <Figure
      caption={
        <>
          Mesures du TP sur un Mac à 12 cœurs : 8 performance + 4 économes, plus lents. Accélération = T_seq / T(p),
          avec T_seq = 4,05 s. Survoler ou bouger p.
        </>
      }
    >
      <div className="space-y-3">
        <p className="flex flex-wrap gap-x-6 font-mono text-[13px] text-fg">
          <span>
            <span style={{ color: C.blue }}>━━ natif</span> : 4096 goroutines
          </span>
          <span>
            <span style={{ color: C.orange }}>━━ blocs</span> : p bandes fixes
          </span>
          <span className="text-fg-weak">┄┄ idéal : accélération p</span>
        </p>
        <svg viewBox="0 0 720 300" className="w-full max-w-[720px]" role="img" aria-label="Courbes d'accélération de natif et de blocs en fonction de p">
          <rect x={xs(8)} y={Y1} width={xs(12) - xs(8) + 10} height={Y0 - Y1} fill={C.fill2} />
          <text x={(xs(8) + xs(12)) / 2 + 5} y={Y1 + 16} textAnchor="middle" fill={C.weak} fontSize={12}>
            {"cœurs économes"}
          </text>
          {[0, 2, 4, 6, 8, 10, 12].map((a) => (
            <g key={a}>
              <line x1={X0} x2={X1 + 10} y1={ys(a)} y2={ys(a)} stroke={C.line} />
              <text x={X0 - 10} y={ys(a) + 4} textAnchor="end" fill={C.weak} fontSize={12}>
                {a}
              </text>
            </g>
          ))}
          {Array.from({ length: 12 }, (_, k) => (
            <text key={k} x={xs(k + 1)} y={Y0 + 18} textAnchor="middle" fill={C.weak} fontSize={12}>
              {k + 1}
            </text>
          ))}
          <text x={X1 + 10} y={Y0 + 34} textAnchor="end" fill={C.weak} fontSize={12}>
            {"p (goroutines de calcul)"}
          </text>
          <text x={X0 - 44} y={Y1 - 12} fill={C.weak} fontSize={12}>
            {"accélération"}
          </text>
          <line x1={xs(1)} y1={ys(1)} x2={xs(12)} y2={ys(12)} stroke={C.weak} strokeDasharray="5 5" />
          <text x={xs(6)} y={ys(7.4)} textAnchor="end" fill={C.weak} fontSize={12}>
            {"idéal : p"}
          </text>
          <line x1={xs(p)} x2={xs(p)} y1={Y1} y2={Y0} stroke={C.lineStrong} strokeWidth={1.5} />
          <motion.path
            d={chemin(NATIF)}
            fill="none"
            stroke={C.blue}
            strokeWidth={2.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
          />
          <motion.path
            d={chemin(BLOCS)}
            fill="none"
            stroke={C.orange}
            strokeWidth={2.5}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2 }}
          />
          {NATIF.map((t, k) => (
            <circle key={`n${k}`} cx={xs(k + 1)} cy={ys(acc(t))} r={k + 1 === p ? 5.5 : 3.5} fill={C.blue} />
          ))}
          {BLOCS.map((t, k) => (
            <circle key={`b${k}`} cx={xs(k + 1)} cy={ys(acc(t))} r={k + 1 === p ? 5.5 : 3.5} fill={C.orange} />
          ))}
          {Array.from({ length: 12 }, (_, k) => (
            <rect
              key={`h${k}`}
              x={xs(k + 1) - (X1 - X0) / 22}
              y={Y1}
              width={(X1 - X0) / 11}
              height={Y0 - Y1}
              fill="transparent"
              onMouseEnter={() => setP(k + 1)}
            />
          ))}
        </svg>
        <Slider label="p" value={p} min={1} max={12} onChange={setP} />
        <p className="font-mono text-[13px] text-fg-weak">
          p = {p} · <span style={{ color: C.blue }}>natif</span> {fr(NATIF[p - 1])} s → ≈ {fr(acc(NATIF[p - 1]), 1)} ·{" "}
          <span style={{ color: C.orange }}>blocs</span> {fr(BLOCS[p - 1])} s → ≈ {fr(acc(BLOCS[p - 1]), 1)}
        </p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Figure : l'ordonnanceur de Go (version natif)
// ---------------------------------------------------------------------------

type Lieu = "main" | "G" | "P0" | "P1" | "P2" | "P3";
interface EtapeGo {
  label: string;
  crees: number;
  loc: [number, number, number, number];
  etiq: [string, string, string, string];
  glob: number; // remplissage de la file globale, de 0 à 1
  flux: [Lieu, Lieu];
}

const ETAPES_GO: EtapeGo[] = [
  { label: "main crée les goroutines sur P0 : sa file locale se remplit (256 au plus)", crees: 256, loc: [256, 0, 0, 0], etiq: ["256 / 256", "", "", ""], glob: 0, flux: ["main", "P0"] },
  { label: "Les suivantes débordent dans la file globale", crees: 4096, loc: [256, 0, 0, 0], etiq: ["256 / 256", "", "", ""], glob: 1, flux: ["P0", "G"] },
  { label: "P2, sans travail, prend un lot dans la file globale", crees: 4096, loc: [256, 0, 70, 0], etiq: ["256 / 256", "", "un lot", ""], glob: 0.93, flux: ["G", "P2"] },
  { label: "P3, sans travail, vole la moitié de la file de P0 : 128 sur 256", crees: 4096, loc: [128, 0, 70, 128], etiq: ["128", "", "un lot", "128 volées"], glob: 0.93, flux: ["P0", "P3"] },
  { label: "Tout le monde travaille : natif fait déjà du vol de travail", crees: 4096, loc: [128, 70, 70, 128], etiq: ["128", "un lot", "un lot", "128"], glob: 0.86, flux: ["G", "P1"] },
];

function Ordonnanceur() {
  const PX = (k: number) => 20 + k * 160;
  const QW = 140;
  const point = (l: Lieu): [number, number] => {
    if (l === "main") return [PX(0) + QW / 2, 140];
    if (l === "G") return [360, 56];
    return [PX(Number(l[1])) + QW / 2, 182];
  };
  return (
    <Stepper steps={ETAPES_GO.map((e) => e.label)} interval={2200} caption="Version natif : une goroutine par rectangle, et l'ordonnanceur de Go répartit tout seul.">
      {(i) => {
        const e = ETAPES_GO[i];
        const [fx, fy] = point(e.flux[0]);
        const [tx, ty] = point(e.flux[1]);
        return (
          <svg viewBox="0 0 720 250" className="w-full max-w-[720px]" role="img" aria-label="Files locales des contextes d'exécution de Go et file globale">
            <text x={20} y={24} fill={C.ink} fontSize={13}>
              {`goroutines créées : ${e.crees}`}
            </text>
            <text x={222} y={60} textAnchor="end" fill={C.text} fontSize={13}>
              {"file globale"}
            </text>
            <rect x={230} y={44} width={260} height={24} fill="none" stroke={C.lineStrong} />
            <motion.rect x={230} y={44} height={24} fill={C.purple} fillOpacity={0.35} initial={false} animate={{ width: 260 * e.glob }} transition={{ duration: 0.6 }} />
            {[0, 1, 2, 3].map((k) => (
              <g key={k}>
                <rect x={PX(k)} y={124} width={QW} height={32} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
                <text x={PX(k) + QW / 2} y={145} textAnchor="middle" fill={C.ink} fontSize={14}>
                  {k === 0 ? "P0 · main" : `P${k}`}
                </text>
                <rect x={PX(k)} y={172} width={QW} height={20} fill="none" stroke={C.lineStrong} />
                <motion.rect x={PX(k)} y={172} height={20} fill={C.purple} fillOpacity={0.35} initial={false} animate={{ width: (QW * e.loc[k]) / 256 }} transition={{ duration: 0.6 }} />
                <text x={PX(k) + QW / 2} y={210} textAnchor="middle" fill={C.text} fontSize={12}>
                  {e.etiq[k]}
                </text>
              </g>
            ))}
            <text x={680} y={145} textAnchor="middle" fill={C.weak} fontSize={14}>
              {"… P11"}
            </text>
            <text x={20} y={238} fill={C.weak} fontSize={12}>
              {"file locale : 256 goroutines prêtes au plus · GOMAXPROCS = 12 contextes (fixé par -p), 4 dessinés"}
            </text>
            {[0, 1, 2].map((k) => (
              <motion.rect
                key={`${i}-${k}`}
                x={-5}
                y={-5}
                width={10}
                height={10}
                fill={C.purple}
                initial={{ x: fx, y: fy, fillOpacity: 0 }}
                animate={{ x: tx, y: ty, fillOpacity: [0, 1, 1, 0] }}
                transition={{ duration: 1, delay: 0.15 + k * 0.22 }}
              />
            ))}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// Figure : trois travailleurs et leurs deques
// ---------------------------------------------------------------------------

type Niveau = 1 | 2 | 3 | 4;
interface Morceau {
  niv: Niveau;
  w: number; // travailleur qui l'a créé
}
const COTE: Record<Niveau, number> = { 1: 38, 2: 26, 3: 20, 4: 14 };
const MORCEAUX: Record<string, Morceau> = {
  A: { niv: 1, w: 0 },
  B: { niv: 2, w: 0 },
  C: { niv: 2, w: 0 },
  D: { niv: 3, w: 0 },
  E: { niv: 3, w: 0 },
  E1: { niv: 4, w: 0 },
  E2: { niv: 4, w: 0 },
  E3: { niv: 4, w: 0 },
  E4: { niv: 4, w: 0 },
  F: { niv: 2, w: 1 },
  G: { niv: 3, w: 1 },
  H: { niv: 3, w: 1 },
  I: { niv: 3, w: 2 },
  A1: { niv: 2, w: 2 },
  A2: { niv: 2, w: 2 },
  A3: { niv: 2, w: 2 },
  A4: { niv: 2, w: 2 },
};
interface EtatTravailleur {
  main: string | null;
  deque: string[]; // du plus ancien (haut) au plus récent (bas)
}
interface EtapeDeque {
  label: string;
  t: [EtatTravailleur, EtatTravailleur, EtatTravailleur];
  vise?: boolean;
}

const W1_DEBUT: EtatTravailleur = { main: "H", deque: ["F", "G"] };
const ETAPES_DEQUE: EtapeDeque[] = [
  {
    label: "Chacun a sa deque : en haut le plus ancien (gros), en bas le plus récent (petit)",
    t: [{ main: "E", deque: ["A", "B", "C", "D"] }, W1_DEBUT, { main: "I", deque: [] }],
  },
  {
    label: "W0 coupe E en 4 : il empile 3 morceaux en bas et garde le 4e",
    t: [{ main: "E4", deque: ["A", "B", "C", "D", "E1", "E2", "E3"] }, W1_DEBUT, { main: "I", deque: [] }],
  },
  {
    label: "W0 a calculé E4 ; il dépile en bas : le plus récent, E3",
    t: [{ main: "E3", deque: ["A", "B", "C", "D", "E1", "E2"] }, W1_DEBUT, { main: "I", deque: [] }],
  },
  {
    label: "W2 a fini I et sa deque est vide : il n'a plus rien à faire",
    t: [{ main: "E3", deque: ["A", "B", "C", "D", "E1", "E2"] }, W1_DEBUT, { main: null, deque: [] }],
  },
  {
    label: "W2 tire une victime au hasard parmi les autres : W0",
    t: [{ main: "E3", deque: ["A", "B", "C", "D", "E1", "E2"] }, W1_DEBUT, { main: null, deque: [] }],
    vise: true,
  },
  {
    label: "W2 vole en haut : A, le plus ancien, donc le plus gros morceau",
    t: [{ main: "E3", deque: ["B", "C", "D", "E1", "E2"] }, W1_DEBUT, { main: "A", deque: [] }],
  },
  {
    label: "W2 découpe A chez lui : 3 morceaux dans sa deque, il garde le 4e",
    t: [{ main: "E3", deque: ["B", "C", "D", "E1", "E2"] }, W1_DEBUT, { main: "A4", deque: ["A1", "A2", "A3"] }],
  },
  {
    label: "Chacun reprend en bas de sa deque : un seul vol a rempli W2 pour longtemps",
    t: [{ main: "E2", deque: ["B", "C", "D", "E1"] }, { main: "G", deque: ["F"] }, { main: "A4", deque: ["A1", "A2", "A3"] }],
  },
];

const CXW = [120, 360, 600];
const MAIN_Y = 106;
const BAS_DEQUE = 336;

function positionsDeque(e: EtapeDeque): [string, number, number][] {
  const out: [string, number, number][] = [];
  e.t.forEach((tr, w) => {
    if (tr.main) out.push([tr.main, CXW[w], MAIN_Y]);
    let bas = BAS_DEQUE;
    for (let k = tr.deque.length - 1; k >= 0; k--) {
      const id = tr.deque[k];
      const s = COTE[MORCEAUX[id].niv];
      out.push([id, CXW[w], bas - s / 2]);
      bas -= s + 5;
    }
  });
  return out;
}

function Deques() {
  return (
    <Stepper
      steps={ETAPES_DEQUE.map((e) => e.label)}
      interval={2400}
      caption="Deque du cours : la propriétaire empile et dépile en bas (le plus récent) ; une voleuse prend en haut (le plus ancien, le plus gros quand les tâches sont créées par découpe récursive)."
    >
      {(i) => {
        const e = ETAPES_DEQUE[i];
        const pos = positionsDeque(e);
        const posA = pos.find(([id]) => id === "A");
        return (
          <svg viewBox="0 0 720 366" className="w-full max-w-[720px]" role="img" aria-label="Trois travailleurs avec leurs deques ; un travailleur sans travail vole en haut de la deque d'un autre">
            <ArrowMarkers />
            {CXW.map((cx, w) => {
              const inactif = e.t[w].main === null && e.t[w].deque.length === 0;
              return (
                <g key={w}>
                  <rect x={cx - 65} y={40} width={130} height={32} rx={3} fill={C.fill} stroke={inactif ? C.faint : couleur(w)} strokeWidth={1.5} strokeDasharray={inactif ? "4 3" : undefined} />
                  <text x={cx} y={61} textAnchor="middle" fill={inactif ? C.weak : C.ink} fontSize={14}>
                    {inactif ? `W${w} : inactif` : `W${w}`}
                  </text>
                  <rect x={cx - 26} y={82} width={52} height={48} fill="none" stroke={C.line} strokeDasharray="3 3" />
                  <text x={cx - 34} y={110} textAnchor="end" fill={C.weak} fontSize={12}>
                    {"en main"}
                  </text>
                  <text x={cx} y={146} textAnchor="middle" fill={C.green} fontSize={12}>
                    {"haut : voleuses"}
                  </text>
                  <rect x={cx - 50} y={152} width={100} height={188} fill={C.paper} stroke={C.lineStrong} />
                  <text x={cx} y={358} textAnchor="middle" fill={C.blue} fontSize={12}>
                    {"bas : propriétaire"}
                  </text>
                </g>
              );
            })}
            <AnimatePresence>
              {pos.map(([id, x, y]) => {
                const m = MORCEAUX[id];
                const s = COTE[m.niv];
                return (
                  <motion.g
                    key={id}
                    initial={{ x: CXW[m.w], y: MAIN_Y, scale: 0 }}
                    animate={{ x, y, scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.55 }}
                  >
                    <rect x={-s / 2} y={-s / 2} width={s} height={s} fill={couleur(m.w)} fillOpacity={0.25} stroke={couleur(m.w)} strokeWidth={1.5} />
                    {s >= 20 && (
                      <text y={4} textAnchor="middle" fill={C.ink} fontSize={12}>
                        {id}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </AnimatePresence>
            {e.vise && posA && (
              <motion.path
                key={`vise-${i}`}
                d={`M 600 40 C 600 6, 240 6, 240 60 L 240 ${posA[2] - 22} Q 240 ${posA[2]} 182 ${posA[2]}`}
                fill="none"
                stroke={C.green}
                strokeWidth={2}
                markerEnd="url(#arr-green)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
              />
            )}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// Figure : la terminaison avec un compteur
// ---------------------------------------------------------------------------

type Quart = "HG" | "HD" | "BG" | "BD";
interface EtapeFin {
  label: string;
  file: (Quart | "image")[];
  main: Quart | null;
  faits: Quart[];
  n: number;
  delta: string;
}
const ETAPES_FIN: EtapeFin[] = [
  { label: "Départ : enCours = 1, l'image entière est en file", file: ["image"], main: null, faits: [], n: 1, delta: "" },
  { label: "Découpe en 4 : 3 morceaux en file, on garde BD : 1 + 3 = 4", file: ["HG", "HD", "BG"], main: "BD", faits: [], n: 4, delta: "+3" },
  { label: "Calculer(BD), puis −1 : enCours = 3", file: ["HG", "HD", "BG"], main: null, faits: ["BD"], n: 3, delta: "−1" },
  { label: "Prendre le plus récent (BG), Calculer, −1 : enCours = 2", file: ["HG", "HD"], main: null, faits: ["BD", "BG"], n: 2, delta: "−1" },
  { label: "HD : Calculer, −1 : enCours = 1", file: ["HG"], main: null, faits: ["BD", "BG", "HD"], n: 1, delta: "−1" },
  { label: "enCours = 0 : plus rien en file ni en cours, tout le monde s'arrête", file: [], main: null, faits: ["BD", "BG", "HD", "HG"], n: 0, delta: "−1" },
];
const QUARTS: [Quart, number, number][] = [
  ["HG", 0, 0],
  ["HD", 1, 0],
  ["BG", 0, 1],
  ["BD", 1, 1],
];

function Terminaison() {
  const SX = 40;
  const SY = 44;
  const CL = 60;
  return (
    <Stepper
      steps={ETAPES_FIN.map((e) => e.label)}
      interval={2000}
      caption="Démo sur 2 × 2 cases, grain 1 case. Image réelle : 1 + 3 × 1365 = 4096, le nombre de Calculer."
    >
      {(i) => {
        const e = ETAPES_FIN[i];
        return (
          <svg viewBox="0 0 720 200" className="w-full max-w-[720px]" role="img" aria-label="Compteur atomique de tâches pas encore terminées">
            <text x={SX} y={30} fill={C.weak} fontSize={12}>
              {"image (2 × 2 cases)"}
            </text>
            {QUARTS.map(([q, cx, cy]) => {
              const fait = e.faits.includes(q);
              const enFile = e.file.includes(q);
              const enMain = e.main === q;
              return (
                <g key={q}>
                  <motion.rect
                    x={SX + cx * CL + 3}
                    y={SY + cy * CL + 3}
                    width={CL - 6}
                    height={CL - 6}
                    fill={fait ? C.green : enFile ? C.purple : C.fill}
                    initial={false}
                    animate={{ fillOpacity: fait ? 0.4 : enFile ? 0.12 : 1 }}
                    stroke={enMain ? C.orange : enFile ? C.purple : C.line}
                    strokeWidth={enMain ? 3 : 1.5}
                    strokeDasharray={enFile ? "5 4" : undefined}
                  />
                  <text x={SX + cx * CL + CL / 2} y={SY + cy * CL + CL / 2 + 5} textAnchor="middle" fill={C.ink} fontSize={13}>
                    {q}
                  </text>
                </g>
              );
            })}
            {e.file.includes("image") && (
              <rect x={SX} y={SY} width={2 * CL} height={2 * CL} fill={C.purple} fillOpacity={0.12} stroke={C.purple} strokeWidth={2} strokeDasharray="6 4" />
            )}
            <text x={220} y={30} fill={C.weak} fontSize={12}>
              {"file de la goroutine"}
            </text>
            <rect x={220} y={44} width={230} height={52} fill={C.paper} stroke={C.lineStrong} />
            <AnimatePresence>
              {e.file.map((q, k) => (
                <motion.g key={q} initial={{ scale: 0, x: 232 + k * 72, y: 52 }} animate={{ scale: 1, x: 232 + k * 72, y: 52 }} exit={{ scale: 0 }} transition={{ duration: 0.4 }}>
                  <rect width={q === "image" ? 90 : 60} height={36} fill={C.purple} fillOpacity={0.2} stroke={C.purple} strokeWidth={1.5} />
                  <text x={q === "image" ? 45 : 30} y={23} textAnchor="middle" fill={C.ink} fontSize={13}>
                    {q}
                  </text>
                </motion.g>
              ))}
            </AnimatePresence>
            <text x={220} y={122} fill={C.weak} fontSize={12}>
              {"en main :"}
            </text>
            <text x={290} y={122} fill={e.main ? C.orange : C.weak} fontSize={13}>
              {e.main ?? "rien"}
            </text>
            <rect x={500} y={44} width={190} height={92} rx={3} fill={C.fill} stroke={e.n === 0 ? C.green : C.lineStrong} strokeWidth={1.5} />
            <text x={595} y={70} textAnchor="middle" fill={C.text} fontSize={13}>
              {"enCours (atomic.Int64)"}
            </text>
            <motion.text key={`n-${i}`} x={595} y={106} textAnchor="middle" fill={e.n === 0 ? C.green : C.ink} fontSize={15} fontWeight={700} initial={{ fillOpacity: 0, y: -8 }} animate={{ fillOpacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              {`= ${e.n}`}
            </motion.text>
            {e.delta && (
              <motion.text key={`d-${i}`} x={660} y={106} fill={e.delta === "+3" ? C.purple : C.orange} fontSize={14} fontWeight={600} initial={{ fillOpacity: 1, y: 0 }} animate={{ fillOpacity: [1, 1, 0], y: [0, 0, -16] }} transition={{ duration: 1.7, times: [0, 0.2, 1] }}>
                {e.delta}
              </motion.text>
            )}
            <text x={SX} y={186} fill={C.weak} fontSize={12}>
              {"+3 à chaque découpe · −1 après chaque Calculer · on boucle tant que enCours.Load() > 0"}
            </text>
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// Figure : channel ou deque, que prend la voleuse ?
// ---------------------------------------------------------------------------

type ModeFile = "channel" | "deque" | "rec";
const LARG_REC = [1, 1, 1, 4, 4, 16, 16];

function ChannelOuDeque() {
  const [mode, setMode] = useState<ModeFile>("channel");
  const [tour, setTour] = useState(0);
  const X0 = 112;
  const LW = 496;
  const GAP = 8;
  const largeurs = mode === "rec" ? LARG_REC.map((u) => ((LW - 6 * GAP) * u) / 43) : LARG_REC.map(() => (LW - 6 * GAP) / 7);
  const xs: number[] = [];
  largeurs.reduce((x, w) => {
    xs.push(x);
    return x + w + GAP;
  }, X0);
  const vole = mode === "channel" ? 0 : 6;
  const RY = 76;
  const RH = 40;
  const texte: Record<ModeFile, string> = {
    channel: "V prend 2 : exactement le prochain de P. La bande de P est grignotée par l'avant.",
    deque: "V prend 8 : ce que P aurait fait en dernier. P garde sa suite 2, 3, 4… (ses données restent en cache).",
    rec: "Le plus ancien est le plus gros : un seul vol emporte 16 fois plus de travail qu'un petit morceau.",
  };
  return (
    <Figure caption={<>Un channel est une file FIFO : on y prend toujours le plus ancien, la propriétaire comme les voleuses. P = propriétaire (elle a déjà fait 1), V = voleuse.</>}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Choice
            label="File"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setTour((t) => t + 1);
            }}
            options={[
              { value: "channel", label: "channel (vol)" },
              { value: "deque", label: "deque" },
              { value: "rec", label: "deque, tâches récursives" },
            ]}
          />
          <button
            type="button"
            onClick={() => setTour((t) => t + 1)}
            className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
          >
            ↻ rejouer
          </button>
        </div>
        <svg viewBox="0 0 720 210" className="w-full max-w-[720px]" role="img" aria-label="File d'une propriétaire : la voleuse prend au même bout avec un channel, à l'autre bout avec une deque">
          {mode === "channel" ? (
            <text x={X0} y={50} fill={C.text} fontSize={12}>
              {"← tête : le plus ancien (P et V prennent ici)"}
            </text>
          ) : (
            <>
              <text x={X0} y={50} fill={C.blue} fontSize={12}>
                {mode === "rec" ? "← bout de P : le plus récent" : "← bout de P"}
              </text>
              <text x={X0 + LW} y={50} textAnchor="end" fill={C.green} fontSize={12}>
                {mode === "rec" ? "bout de V : le plus ancien →" : "bout de V →"}
              </text>
            </>
          )}
          <circle cx={70} cy={mode === "channel" ? 78 : RY + RH / 2} r={15} fill={C.fill} stroke={C.blue} strokeWidth={2} />
          <text x={70} y={(mode === "channel" ? 78 : RY + RH / 2) + 5} textAnchor="middle" fill={C.blue} fontSize={14} fontWeight={600}>
            {"P"}
          </text>
          <circle cx={mode === "channel" ? 70 : 650} cy={mode === "channel" ? 116 : RY + RH / 2} r={15} fill={C.fill} stroke={C.green} strokeWidth={2} />
          <text x={mode === "channel" ? 70 : 650} y={(mode === "channel" ? 116 : RY + RH / 2) + 5} textAnchor="middle" fill={C.green} fontSize={14} fontWeight={600}>
            {"V"}
          </text>
          <g key={`${mode}-${tour}`}>
            {largeurs.map((w, k) => {
              const contenu = (
                <>
                  <rect x={xs[k]} y={RY} width={r3(w)} height={RH} fill={C.blue} fillOpacity={0.18} stroke={C.blue} strokeWidth={1.5} />
                  {w >= 14 && (
                    <text x={xs[k] + w / 2} y={RY + 25} textAnchor="middle" fill={C.ink} fontSize={13}>
                      {mode === "rec" ? `×${LARG_REC[k]}` : `${k + 2}`}
                    </text>
                  )}
                </>
              );
              if (k !== vole) return <g key={k}>{contenu}</g>;
              return (
                <motion.g key={k} initial={{ y: 0 }} animate={{ y: 72 }} transition={{ delay: 0.7, duration: 0.8 }}>
                  {contenu}
                  <motion.rect
                    x={xs[k] - 2}
                    y={RY - 2}
                    width={r3(w + 4)}
                    height={RH + 4}
                    fill="none"
                    stroke={C.green}
                    strokeWidth={2.5}
                    {...apparitionTrait(1.4)}
                  />
                </motion.g>
              );
            })}
            <motion.text
              x={mode === "channel" ? xs[0] : xs[6] + largeurs[6] / 2}
              y={RY + RH + 72 + 20}
              textAnchor={mode === "channel" ? "start" : "middle"}
              fill={C.green}
              fontSize={12}
              {...apparitionTexte(1.5)}
            >
              {"volé par V"}
            </motion.text>
          </g>
        </svg>
        <p className="font-mono text-[13px] leading-relaxed text-fg-strong">{texte[mode]}</p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Figure : volrec-fifo (largeur) ou volrec (profondeur), à p = 1
// ---------------------------------------------------------------------------

interface Carre {
  x: number;
  y: number;
  s: number;
  id: string;
}
interface EtatParcours {
  label: string;
  file: Carre[];
  main: Carre | null;
  faits: boolean[];
  max: number;
  enCours: number;
}

const carre = (x: number, y: number, s: number): Carre => ({ x, y, s, id: `${x}-${y}-${s}` });

function parcours(lifo: boolean): EtatParcours[] {
  const etats: EtatParcours[] = [];
  let file: Carre[] = [carre(0, 0, 8)];
  let main: Carre | null = null;
  const faits = new Array<boolean>(64).fill(false);
  let max = 1;
  let enCours = 1;
  etats.push({ label: "Départ : l'image entière (8 × 8) en file", file, main, faits: [...faits], max, enCours });
  while (file.length > 0 || main) {
    let cur: Carre;
    if (main) cur = main;
    else {
      cur = lifo ? file[file.length - 1] : file[0];
      file = lifo ? file.slice(0, -1) : file.slice(1);
    }
    let label: string;
    if (cur.s > 1) {
      const h = cur.s / 2;
      file = [...file, carre(cur.x, cur.y, h), carre(cur.x + h, cur.y, h), carre(cur.x, cur.y + h, h)];
      enCours += 3;
      main = carre(cur.x + h, cur.y + h, h);
      max = Math.max(max, file.length);
      label = `Découpe en 4 : 3 en file (${file.length}), on garde le 4e`;
    } else {
      faits[cur.y * 8 + cur.x] = true;
      enCours -= 1;
      main = null;
      label = `Calculer une case (file : ${file.length})`;
    }
    etats.push({ label, file, main, faits: [...faits], max, enCours });
  }
  return etats;
}

const COTE_FILE: Record<number, number> = { 8: 26, 4: 20, 2: 13, 1: 8 };

function VueParcours({ e, lifo }: { e: EtatParcours; lifo: boolean }) {
  const GX = 20;
  const GY = 40;
  const CL = 24;
  const QX = 250;
  const QW = 450;
  const places: [Carre, number, number][] = [];
  let x = QX;
  let y = 86;
  for (const c of e.file) {
    const s = COTE_FILE[c.s];
    if (x + s > QX + QW) {
      x = QX;
      y += 28;
    }
    places.push([c, x + s / 2, y]);
    x += s + 5;
  }
  return (
    <svg viewBox="0 0 720 250" className="w-full max-w-[720px]" role="img" aria-label="Parcours de la découpe récursive avec une file FIFO ou une deque">
      <text x={GX} y={28} fill={C.weak} fontSize={12}>
        {"image 8 × 8, grain 1 case"}
      </text>
      {e.faits.map((f, k) => (
        <rect key={k} x={GX + (k % 8) * CL} y={GY + Math.floor(k / 8) * CL} width={CL} height={CL} fill={f ? C.blue : C.fill} fillOpacity={f ? 0.45 : 1} stroke={C.line} />
      ))}
      {e.file.map((c) => (
        <rect key={c.id} x={GX + c.x * CL + 2} y={GY + c.y * CL + 2} width={c.s * CL - 4} height={c.s * CL - 4} fill="none" stroke={C.purple} strokeDasharray="4 3" />
      ))}
      {e.main && <rect x={GX + e.main.x * CL + 1} y={GY + e.main.y * CL + 1} width={e.main.s * CL - 2} height={e.main.s * CL - 2} fill="none" stroke={C.orange} strokeWidth={3} />}
      <text x={QX} y={28} fill={C.ink} fontSize={13}>
        {`file : ${e.file.length} descripteurs · max ${e.max} · enCours ${e.enCours}`}
      </text>
      <text x={QX} y={50} fill={lifo ? C.blue : C.orange} fontSize={12}>
        {lifo ? "deque : la propriétaire reprend à droite, le plus récent (petit)" : "channel : la propriétaire reprend à gauche, le plus ancien (gros)"}
      </text>
      <AnimatePresence>
        {places.map(([c, px, py]) => {
          const s = COTE_FILE[c.s];
          return (
            <motion.g key={c.id} initial={{ x: px, y: py, scale: 0 }} animate={{ x: px, y: py, scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
              <rect x={-s / 2} y={-s / 2} width={s} height={s} fill={C.purple} fillOpacity={0.25} stroke={C.purple} strokeWidth={1.2} />
            </motion.g>
          );
        })}
      </AnimatePresence>
      <rect x={QX} y={224} width={12} height={12} fill="none" stroke={C.orange} strokeWidth={3} />
      <text x={QX + 18} y={234} fill={C.weak} fontSize={12}>
        {"en main"}
      </text>
      <rect x={QX + 90} y={224} width={12} height={12} fill={C.purple} fillOpacity={0.25} stroke={C.purple} strokeDasharray="3 2" />
      <text x={QX + 108} y={234} fill={C.weak} fontSize={12}>
        {"en file"}
      </text>
      <rect x={QX + 180} y={224} width={12} height={12} fill={C.blue} fillOpacity={0.45} />
      <text x={QX + 198} y={234} fill={C.weak} fontSize={12}>
        {"calculée"}
      </text>
    </svg>
  );
}

function Parcours() {
  const [mode, setMode] = useState<"fifo" | "lifo">("fifo");
  const etats = useMemo(() => parcours(mode === "lifo"), [mode]);
  return (
    <div className="space-y-3">
      <Choice
        label="À p = 1"
        value={mode}
        onChange={setMode}
        options={[
          { value: "fifo", label: "volrec-fifo (channel)" },
          { value: "lifo", label: "volrec (deque)" },
        ]}
      />
      <Stepper
        key={mode}
        steps={etats.map((e) => e.label)}
        interval={260}
        caption={
          <>
            Illustration : 3 niveaux de découpe, max {mode === "lifo" ? "9 = 3 × 3" : "39"}. Mesuré sur l&apos;image du TP (grain 32,
            6 niveaux car 2048 / 32 = 64 = 2⁶) : volrec-fifo jusqu&apos;à 1659 descripteurs en file, volrec 18 = 3 × 6.
          </>
        }
      >
        {(i) => <VueParcours e={etats[i]} lifo={mode === "lifo"} />}
      </Stepper>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figure : l'effet du grain, à p = 12 (mesures du TP)
// ---------------------------------------------------------------------------

interface MesureGrain {
  g: number;
  natif: number;
  vol: [number, number, number]; // temps, vols, file max
  fifo: [number, number, number];
  rec: [number, number, number];
}
const GRAINS: MesureGrain[] = [
  { g: 4, natif: 0.5007, vol: [0.4749, 20078, 21846], fifo: [0.4759, 46553, 28751], rec: [0.4821, 247, 26] },
  { g: 8, natif: 0.4798, vol: [0.4682, 5253, 5462], fifo: [0.4696, 6758, 5454], rec: [0.469, 213, 24] },
  { g: 16, natif: 0.4684, vol: [0.4634, 1425, 1366], fifo: [0.4711, 2938, 1947], rec: [0.4613, 179, 21] },
  { g: 32, natif: 0.4643, vol: [0.4644, 397, 342], fifo: [0.466, 675, 402], rec: [0.4671, 97, 18] },
  { g: 64, natif: 0.4817, vol: [0.4776, 117, 86], fifo: [0.4925, 163, 165], rec: [0.4872, 60, 15] },
  { g: 128, natif: 0.5476, vol: [0.5134, 62, 22], fifo: [0.5588, 101, 34], rec: [0.5424, 56, 12] },
  { g: 256, natif: 0.7634, vol: [0.7683, 21, 6], fifo: [0.9158, 47, 10], rec: [0.7974, 33, 9] },
];

interface LigneGrain {
  nom: string;
  c: string;
  w: number;
  txt: string;
}

function Grain() {
  const [g, setG] = useState(32);
  const m = GRAINS.find((x) => x.g === g) ?? GRAINS[3];
  const LX = 140;
  const W = 470;
  const log = (v: number) => r3((W * Math.log10(Math.max(v, 1))) / 5);
  const lin = (t: number) => r3(W * t);
  const panneaux: { titre: string; y: number; lignes: LigneGrain[] }[] = [
    {
      titre: "vols réussis (échelle log)",
      y: 22,
      lignes: [
        { nom: "vol", c: C.green, w: log(m.vol[1]), txt: milliers(m.vol[1]) },
        { nom: "volrec-fifo", c: C.orange, w: log(m.fifo[1]), txt: milliers(m.fifo[1]) },
        { nom: "volrec", c: C.blue, w: log(m.rec[1]), txt: milliers(m.rec[1]) },
      ],
    },
    {
      titre: "taille max des files (échelle log)",
      y: 114,
      lignes: [
        { nom: "volrec-fifo", c: C.orange, w: log(m.fifo[2]), txt: milliers(m.fifo[2]) },
        { nom: "volrec", c: C.blue, w: log(m.rec[2]), txt: milliers(m.rec[2]) },
      ],
    },
    {
      titre: "temps (s, de 0 à 1)",
      y: 184,
      lignes: [
        { nom: "natif", c: C.purple, w: lin(m.natif), txt: fr(m.natif, 3) },
        { nom: "vol", c: C.green, w: lin(m.vol[0]), txt: fr(m.vol[0], 3) },
        { nom: "volrec-fifo", c: C.orange, w: lin(m.fifo[0]), txt: fr(m.fifo[0], 3) },
        { nom: "volrec", c: C.blue, w: lin(m.rec[0]), txt: fr(m.rec[0], 3) },
      ],
    },
  ];
  return (
    <Figure caption="Mesures du TP à p = 12, pour un grain de g × g pixels (options -m et -n).">
      <div className="space-y-3">
        <Choice label="grain g" value={g} onChange={setG} options={GRAINS.map((x) => x.g)} />
        <svg viewBox="0 0 720 290" className="w-full max-w-[720px]" role="img" aria-label="Nombre de vols, taille maximale des files et temps de chaque version selon le grain">
          {panneaux.map((pn) => (
            <g key={pn.titre}>
              <text x={12} y={pn.y} fill={C.weak} fontSize={12}>
                {pn.titre}
              </text>
              {pn.lignes.map((l, k) => {
                const y = pn.y + 10 + k * 22;
                return (
                  <g key={l.nom}>
                    <text x={12} y={y + 12} fill={C.ink} fontSize={13}>
                      {l.nom}
                    </text>
                    <rect x={LX} y={y} width={W} height={15} fill={C.fill} />
                    <motion.rect x={LX} y={y} height={15} fill={l.c} fillOpacity={0.75} initial={{ width: 0 }} animate={{ width: l.w }} transition={{ duration: 0.5 }} />
                    <text x={LX + W + 8} y={y + 12} fill={C.ink} fontSize={13}>
                      {l.txt}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        <p className="font-mono text-[13px] text-fg-weak">
          grain {g} × {g} : <span className="text-fg-strong">{milliers((2048 / g) ** 2)} rectangles</span> pour 12 goroutines.
        </p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// Le code
// ---------------------------------------------------------------------------

const CODE_BLOCS = `
var wg sync.WaitGroup
for i := range P.P {
    debut := i * P.Taille / P.P
    fin := (i + 1) * P.Taille / P.P          // la dernière : fin = Taille
    r := Rect{debut, 0, fin - debut, P.Taille} // Y, X, H lignes, L colonnes
    wg.Go(func() { Calculer(P, img, r, i) })  // Go ≥ 1.22 : i et r propres au tour
}
wg.Wait()
`;

const CODE_VOL = `
files := make([]chan Rect, P.P)
for i := range files {
    files[i] = make(chan Rect, len(rects)) // sinon nil : bloque pour toujours
}
for k, r := range rects {
    files[k*P.P/len(rects)] <- r // paquets contigus, comme blocs
}
var aPrendre atomic.Int64 // descripteurs encore en file
aPrendre.Store(int64(len(rects)))

// dans la goroutine i (wg.Go) :
for aPrendre.Load() > 0 {
    var r Rect
    select {
    case r = <-files[i]: // ma file d'abord
    default:
        if P.P == 1 {
            continue // aucune victime possible
        }
        select { // tentative de vol : ne bloque jamais
        case r = <-files[victime(i, P.P)]:
            st.Vols++
        default:
            st.Echecs++
            continue // une autre victime
        }
    }
    aPrendre.Add(-1)
    Calculer(P, img, r, i)
}

func victime(i, p int) int { // j != i, p >= 2
    j := rand.IntN(p - 1)
    if j >= i {
        j++
    }
    return j
}
`;

const CODE_DEQUE = `
type deque struct {
    mu sync.Mutex
    s  []Rect
}

func (d *deque) Pousser(r Rect) { // la propriétaire empile à la fin
    d.mu.Lock()
    defer d.mu.Unlock()
    d.s = append(d.s, r)
}

func (d *deque) Prendre() (Rect, bool) { // la propriétaire : le plus récent
    d.mu.Lock()
    defer d.mu.Unlock()
    if len(d.s) == 0 {
        return Rect{}, false
    }
    r := d.s[len(d.s)-1]
    d.s = d.s[:len(d.s)-1]
    return r, true
}

func (d *deque) Voler() (Rect, bool) { // une voleuse : le plus ancien, le plus gros
    d.mu.Lock()
    defer d.mu.Unlock()
    if len(d.s) == 0 {
        return Rect{}, false
    }
    r := d.s[0]
    d.s = d.s[1:]
    return r, true
}
`;

const CODE_VOLREC = `
var enCours atomic.Int64 // tâches pas encore terminées (en file ou en cours)
enCours.Store(1)         // la première : toute l'image, dans files[0]

for enCours.Load() > 0 {
    r, ok := files[i].Prendre()
    if !ok {
        if P.P == 1 {
            continue
        }
        if r, ok = files[victime(i, P.P)].Voler(); !ok {
            continue // échec : on recommence
        }
    }
    for r.H > P.M || r.L > P.N { // au-dessus du grain : couper
        morceaux, garde := couper(P, r) // 4 morceaux (2 si une seule dimension dépasse)
        enCours.Add(int64(len(morceaux))) // +3 AVANT de pousser
        for _, m := range morceaux {
            files[i].Pousser(m)
        }
        r = garde // on continue avec le dernier
    }
    Calculer(P, img, r, i)
    enCours.Add(-1)
}
`;

const CMD = `
make                                   # compile ./mandel (Go 1.25 ou plus)
./mandel seq
./mandel natif -p 4 -m 16 -n 64 -o natif.png
./mandel blocs -p 12 -o blocs.png      # une couleur par goroutine
make race                              # ./mandel-race : détecteur d'accès concurrents
`;

type Onglet = "blocs" | "vol" | "deque" | "volrec" | "cmd";

const CODES: Record<Onglet, { code: string; lang: string; mark: number[] }> = {
  blocs: { code: CODE_BLOCS, lang: "go", mark: [5, 6] },
  vol: { code: CODE_VOL, lang: "go", mark: [3, 15, 21, 23] },
  deque: { code: CODE_DEQUE, lang: "go", mark: [18, 19, 29, 30] },
  volrec: { code: CODE_VOLREC, lang: "go", mark: [16, 23] },
  cmd: { code: CMD, lang: "bash", mark: [] },
};

function LeCode() {
  const [o, setO] = useState<Onglet>("vol");
  const c = CODES[o];
  return (
    <div className="space-y-3">
      <Choice
        value={o}
        onChange={setO}
        options={[
          { value: "blocs", label: "blocs" },
          { value: "vol", label: "vol" },
          { value: "deque", label: "deque" },
          { value: "volrec", label: "volrec" },
          { value: "cmd", label: "commandes" },
        ]}
      />
      <Code key={o} code={c.code} lang={c.lang} mark={c.mark} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// La fiche
// ---------------------------------------------------------------------------

export default function VolDeTravail() {
  const cout = useMemo(() => grilleCouts(), []);
  return (
    <>
      <Section title="L'idée">
        <Idea>
          Quand le travail est inégal, on ne le partage pas d&apos;avance : une goroutine qui n&apos;a plus rien vole du
          travail à une autre.
        </Idea>
        <p>
          Le TP calcule une image de Mandelbrot de <strong>2048 × 2048</strong> pixels, au plus <strong>5000</strong>{" "}
          itérations par pixel.
        </p>
        <p>
          L&apos;image est coupée en <strong>4096 rectangles</strong> de 32 × 32. En séquentiel : <strong>4,05 s</strong>.
        </p>
        <table className="ftable">
          <thead>
            <tr>
              <th>Mot</th>
              <th>Dans le TP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>tâche</td>
              <td>
                calculer un rectangle (<code>Calculer</code>) ; elle n&apos;a ni pile ni état
              </td>
            </tr>
            <tr>
              <td>descripteur</td>
              <td>
                la valeur <code>Rect</code> du rectangle : c&apos;est elle qu&apos;on met en file, qu&apos;on prend, qu&apos;on vole
              </td>
            </tr>
            <tr>
              <td>goroutine</td>
              <td>
                un thread léger de Go, exécuté sur l&apos;un des <code>GOMAXPROCS</code> contextes
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Un travail très inégal">
        <p>Un pixel dans l&apos;ensemble coûte 5000 itérations. Un pixel loin de l&apos;ensemble en coûte quelques-unes.</p>
        <p>Le coût est donc concentré au milieu de l&apos;image. Le haut et le bas ne coûtent presque rien.</p>
        <Figure caption="Illustration calculée par cette page : itérations au centre de chaque case, grille 32 × 32 (le TP a 64 × 64 rectangles). Plus la case est marquée, plus elle coûte.">
          <CarteCouts cout={cout} />
        </Figure>
      </Section>

      <Section title="Découper d'avance : la version blocs">
        <p>
          <strong>blocs</strong> lance p goroutines. La goroutine i calcule les lignes de i·taille/p à (i+1)·taille/p.
        </p>
        <p>
          C&apos;est une boucle OpenMP en <code>schedule(static)</code> : le partage est fixé avant de connaître les coûts.
        </p>
        <BlocsOuVol cout={cout} />
        <p>À p = 2, l&apos;image est symétrique haut-bas : deux moitiés égales, 2,07 s pour blocs comme pour natif.</p>
        <p>
          À p = 3, la bande du milieu contient presque tout l&apos;ensemble : blocs met <strong>3,89 s</strong>, à peine
          mieux que 4,05 s.
        </p>
        <Courbes />
        <p>
          natif monte à ≈ 8,7 à p = 12 ; blocs plafonne vers 3. Au-delà de 8, natif progresse moins vite : ce sont les
          cœurs économes.
        </p>
      </Section>

      <Section title="natif : l'ordonnanceur de Go vole déjà">
        <p>
          <strong>natif</strong> crée une goroutine par rectangle : 4096 goroutines. Go les répartit tout seul.
        </p>
        <p>
          Cela marche comme un <code>schedule(dynamic)</code> : un contexte libre prend la suite.
        </p>
        <Ordonnanceur />
        <Note title="Le sujet du TP">
          <p>
            Depuis Go 1.1, chacun des GOMAXPROCS contextes d&apos;exécution garde une file locale d&apos;au plus 256
            goroutines prêtes.
          </p>
          <p>Un contexte dont la file est vide prend la moitié de la file d&apos;un autre, en les parcourant dans un ordre aléatoire.</p>
        </Note>
      </Section>

      <Section title="Le vol de travail">
        <ul className="flist">
          <li>p goroutines, vivantes jusqu&apos;à la fin ; chacune a sa file de descripteurs.</li>
          <li>Elle prend d&apos;abord dans sa propre file.</li>
          <li>File vide : elle tire une victime j ≠ i au hasard et tente de lui voler un descripteur.</li>
          <li>
            Une tentative ne bloque jamais : <code>select</code> avec un cas <code>default</code>. Échec : on recommence.
          </li>
        </ul>
        <Deques />
        <p>
          <strong>Quand s&apos;arrêter ?</strong> Tâches statiques (vol) : un compteur atomique <code>aPrendre</code> des
          descripteurs encore en file. À 0, il n&apos;y a plus rien nulle part.
        </p>
        <p>
          Tâches dynamiques (volrec) : toutes les files peuvent être vides alors qu&apos;une goroutine va encore en
          ajouter. On compte donc les tâches <strong>pas encore terminées</strong>.
        </p>
        <Terminaison />
        <p>Les morceaux sont ajoutés avant la fin de leur parent : le compte ne tombe jamais à 0 trop tôt.</p>
      </Section>

      <Section title="Channel ou deque ?">
        <ChannelOuDeque />
        <p>Tâches statiques de même taille : le temps change peu. Tâches créées par découpe récursive : ça change tout.</p>
        <p>
          Découpe récursive : un rectangle plus gros que le grain est coupé en 4 ; 3 morceaux vont en file, on continue
          avec le 4e.
        </p>
        <Parcours />
        <ul className="flist">
          <li>
            <strong>volrec-fifo</strong> reprend le plus gros : parcours en <strong>largeur</strong>, la file enfle (1659
            descripteurs pour 5461 tâches = 4096 au grain + 1365 découpes).
          </li>
          <li>
            <strong>volrec</strong> reprend le plus récent : parcours en <strong>profondeur</strong>, 3 morceaux par niveau
            au plus (18).
          </li>
        </ul>
        <Grain />
        <ul className="flist">
          <li>Grain 32 : les quatre versions entre 0,464 et 0,467 s. La différence est dans les vols : 397, 675, 97.</li>
          <li>Grain 4 : 262 144 rectangles ; natif monte à 0,50 s, car créer autant de goroutines coûte.</li>
          <li>Grain 256 : 64 rectangles pour 12 goroutines, trop peu pour équilibrer : 0,76 à 0,92 s.</li>
          <li>volrec-fifo à p = 12 : 3,6 millions de tentatives de vol échouées, une attente active.</li>
        </ul>
        <Note title="Que choisir pour ce calcul ?">
          <p>
            <strong>natif</strong> : même temps, code le plus court, car Go fait déjà du vol de travail.
          </p>
          <p>
            Pour écrire son propre ordonnanceur : <strong>volrec</strong>. Ses vols et ses files ne dépendent presque pas du
            grain. Éviter volrec-fifo : ses files grandissent comme le nombre de rectangles.
          </p>
        </Note>
      </Section>

      <Section title="Le code à connaître">
        <LeCode />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>
            Découpage statique (blocs, <code>schedule(static)</code>) sur un travail inégal : la bande chère travaille
            seule. À p = 12 : 1,36 s contre 0,46 s.
          </li>
          <li>Vol de travail : chacun sa file ; file vide → vol chez une victime tirée au hasard. Rien à prévoir d&apos;avance.</li>
          <li>
            Tentative de vol non bloquante : <code>select</code> + <code>default</code>.
          </li>
          <li>
            Deque : la propriétaire empile et dépile en bas (le plus récent) ; la voleuse prend en haut (le plus ancien, le
            plus gros).
          </li>
          <li>
            Terminaison : statique → compteur des descripteurs à prendre ; dynamique → compteur des tâches pas terminées
            (+3 par découpe, −1 par Calculer).
          </li>
          <li>À p = 12 : vol 397 vols, volrec-fifo 675 (files de 402), volrec 97 (files de 18).</li>
          <li>natif : Go vole déjà (files locales de 256, vol de la moitié) → même temps, code le plus court.</li>
        </Points>
        <Trap title="Pièges du TP">
          <p>
            <code>make([]chan Rect, p)</code> crée p channels <strong>nil</strong>. Un channel nil bloque pour toujours, sans
            message : un <code>make</code> par case.
          </p>
          <p>
            À p = 1, aucune victime : <code>rand.IntN(0)</code> s&apos;arrête sur une erreur fatale.
          </p>
          <p>
            volrec-fifo : capacité de chaque channel ≥ 2 × le nombre de rectangles au grain. Sinon une goroutine bloque en
            envoyant dans son propre channel plein : interblocage.
          </p>
          <p>
            Deque : méthodes à récepteur <strong>pointeur</strong>. Avec un récepteur valeur, le mutex est copié et ne
            protège rien. Vérifier avec <code>make race</code>.
          </p>
          <p>Vols et échecs : compter en local, puis une case par goroutine, additionnées après wg.Wait().</p>
        </Trap>
        <Reveal question={<p>À p = 3, blocs met 3,89 s contre 4,05 s en séquentiel, et natif 1,52 s. Pourquoi ?</p>}>
          <p>La bande du milieu contient presque tout l&apos;ensemble, la partie chère.</p>
          <p>
            Les goroutines du haut et du bas finissent tout de suite, puis attendent : c&apos;est le déséquilibre de
            schedule(static).
          </p>
          <p>
            natif crée 4096 goroutines ; l&apos;ordonnanceur de Go les répartit dynamiquement (files locales, vol de la
            moitié d&apos;une file).
          </p>
        </Reveal>
        <Reveal question={<p>La file est un channel. Quel descripteur obtient une voleuse ? Et avec une deque ?</p>}>
          <p>Channel (FIFO) : le plus ancien, au même bout que la propriétaire, donc exactement son prochain rectangle.</p>
          <p>Deque : l&apos;autre bout, ce que la propriétaire aurait fait en dernier. Elle garde sa suite contiguë (cache).</p>
          <p>Avec une découpe récursive, le plus ancien est aussi le plus gros : peu de vols (97 contre 675 à p = 12).</p>
        </Reveal>
        <Reveal question={<p>volrec à p = 1 : combien de descripteurs au plus dans la file, avec m = n = 32 et une image de 2048 ?</p>}>
          <p>2048 / 32 = 64 = 2⁶ : 6 niveaux de découpe.</p>
          <p>Parcours en profondeur : au plus 3 morceaux en attente par niveau, donc 3 × 6 = 18.</p>
          <p>volrec-fifo parcourt en largeur : jusqu&apos;à 1659.</p>
        </Reveal>
      </Section>
    </>
  );
}
