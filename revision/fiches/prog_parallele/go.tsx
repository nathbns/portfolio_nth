"use client";
// Fiche Go : goroutines, WaitGroup, channels (rendez-vous, tampon), close et
// range, select, deadlock, et le serveur d'impression du TP (pret, ack).
// Sources : CM Go (vidéo app-04-go-channels), TP Go (app-tp-go) et les notes
// prog_parallele/tp_go/question1.md, question2.md, question3.md.
import { useEffect, useState } from "react";
import {
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
// Petits éléments communs
// ---------------------------------------------------------------------------

type Etat = "normal" | "ok" | "bloque";

function Acteur({
  x,
  y,
  w,
  h,
  label,
  sub,
  etat = "normal",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  etat?: Etat;
}) {
  const stroke = etat === "ok" ? C.green : etat === "bloque" ? C.red : C.lineStrong;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={3}
        fill={C.fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={etat === "bloque" ? "5 4" : undefined}
      />
      <text x={x + w / 2} y={sub ? y + h / 2 - 3 : y + h / 2 + 5} textAnchor="middle" fill={C.ink} fontSize={14}>
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 16}
          textAnchor="middle"
          fill={etat === "bloque" ? C.red : etat === "ok" ? C.green : C.weak}
          fontSize={12}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Rejouer({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
    >
      ↻ Rejouer
    </button>
  );
}

// ---------------------------------------------------------------------------
// 1. go rend la main, la fin de main tue tout (TP Q1 et Q2)
// ---------------------------------------------------------------------------

type CasId = "seq" | "gogo" | "goHello" | "goWorld" | "wg";
type Ligne = "main" | "hello" | "world";
type Barre = { row: Ligne; from: number; to: number; kind: "main" | "wait" | "hello" | "world" };
type Point = { row: "hello" | "world"; t: number; etat: "ok" | "perdu" | "peutetre" };
type Cas = {
  code: string;
  sub: { hello: string; world: string };
  bars: Barre[];
  dots: Point[];
  fin?: number;
  out: string;
  why: string;
};

const cinq = (row: "hello" | "world", t0: number, etat: Point["etat"]): Point[] =>
  [0, 1, 2, 3, 4].map((i) => ({ row, t: t0 + 100 * i, etat }));

const CAS: Record<CasId, Cas> = {
  seq: {
    code: `say5("Hello")\nsay5("World")`,
    sub: { hello: "appel normal", world: "appel normal" },
    bars: [
      { row: "main", from: 0, to: 1000, kind: "main" },
      { row: "hello", from: 0, to: 500, kind: "hello" },
      { row: "world", from: 500, to: 1000, kind: "world" },
    ],
    dots: [...cinq("hello", 100, "ok"), ...cinq("world", 600, "ok")],
    out: "5 Hello, puis 5 World",
    why: "Les deux appels se font l'un après l'autre, dans main : 1 s en tout.",
  },
  gogo: {
    code: `go say5("Hello")\ngo say5("World")`,
    sub: { hello: "goroutine", world: "goroutine" },
    bars: [
      { row: "main", from: 0, to: 8, kind: "main" },
      { row: "hello", from: 0, to: 8, kind: "hello" },
      { row: "world", from: 0, to: 8, kind: "world" },
    ],
    dots: [...cinq("hello", 100, "perdu"), ...cinq("world", 100, "perdu")],
    fin: 8,
    out: "rien",
    why: "main lance les deux goroutines et se termine aussitôt, avant la première ligne (100 ms).",
  },
  goHello: {
    code: `go say5("Hello")\nsay5("World")`,
    sub: { hello: "goroutine", world: "appel normal" },
    bars: [
      { row: "main", from: 0, to: 500, kind: "main" },
      { row: "hello", from: 0, to: 500, kind: "hello" },
      { row: "world", from: 0, to: 500, kind: "world" },
    ],
    dots: [
      ...cinq("hello", 100, "ok").slice(0, 4),
      { row: "hello", t: 500, etat: "peutetre" },
      ...cinq("world", 100, "ok"),
    ],
    fin: 500,
    out: "mélangé, 9 ou 10 lignes",
    why: "Les deux [4] arrivent à 500 ms. Si World affiche le sien d'abord, main se termine et [4] Hello est perdu.",
  },
  goWorld: {
    code: `say5("Hello")\ngo say5("World")`,
    sub: { hello: "appel normal", world: "goroutine" },
    bars: [
      { row: "main", from: 0, to: 505, kind: "main" },
      { row: "hello", from: 0, to: 500, kind: "hello" },
      { row: "world", from: 500, to: 505, kind: "world" },
    ],
    dots: [...cinq("hello", 100, "ok"), ...cinq("world", 600, "perdu")],
    fin: 505,
    out: "5 Hello seulement",
    why: "World n'est lancé qu'à 500 ms, et main se termine juste après.",
  },
  wg: {
    code: `var w sync.WaitGroup\nw.Go(func() { say5("Hello") })\nw.Go(func() { say5("World") })\nw.Wait()`,
    sub: { hello: "goroutine", world: "goroutine" },
    bars: [
      { row: "main", from: 0, to: 500, kind: "wait" },
      { row: "hello", from: 0, to: 500, kind: "hello" },
      { row: "world", from: 0, to: 500, kind: "world" },
    ],
    dots: [...cinq("hello", 100, "ok"), ...cinq("world", 100, "ok")],
    out: "10 lignes, par paires",
    why: "w.Wait() attend que les deux goroutines soient finies. Dans une paire, l'ordre change d'une exécution à l'autre.",
  },
};

const OPTIONS_CAS = [
  { value: "seq" as const, label: "sans go" },
  { value: "gogo" as const, label: "go, go" },
  { value: "goHello" as const, label: "go Hello" },
  { value: "goWorld" as const, label: "go World" },
  { value: "wg" as const, label: "WaitGroup" },
];

const DUREE = 4; // secondes d'animation pour 1000 ms
const tx = (t: number) => 120 + t * 0.56;
const ROW_Y: Record<Ligne, number> = { main: 52, hello: 104, world: 156 };

function GoMainFig() {
  const [cas, setCas] = useState<CasId>("seq");
  const [run, setRun] = useState(0);
  const c = CAS[cas];
  const barStyle = (k: Barre["kind"]) =>
    k === "hello"
      ? { fill: C.blue, stroke: C.blue }
      : k === "world"
        ? { fill: C.orange, stroke: C.orange }
        : { fill: C.weak, stroke: C.lineStrong };
  return (
    <Figure caption="Choisir ce que fait main. Point plein : ligne affichée. Cercle barré : ligne jamais affichée (le programme est déjà mort). « ? » : parfois perdue.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Choice label="main :" options={OPTIONS_CAS} value={cas} onChange={(v) => { setCas(v); setRun((r) => r + 1); }} />
          <Rejouer onClick={() => setRun((r) => r + 1)} />
        </div>
        <Code lang="go" code={c.code} />
        <svg viewBox="0 0 720 214" className="w-full max-w-[720px]" role="img" aria-label="Frise de 0 à 1000 ms : quand chaque ligne s'affiche">
          {(["main", "hello", "world"] as const).map((r) => (
            <g key={r}>
              <text x={14} y={ROW_Y[r] + (r === "main" ? 5 : -1)} fill={C.ink} fontSize={14}>
                {r === "main" ? "main" : r === "hello" ? "Hello" : "World"}
              </text>
              {r !== "main" && (
                <text x={14} y={ROW_Y[r] + 15} fill={C.weak} fontSize={12}>
                  {c.sub[r]}
                </text>
              )}
              <line x1={tx(0)} x2={tx(1000)} y1={ROW_Y[r]} y2={ROW_Y[r]} stroke={C.line} />
            </g>
          ))}
          {/* axe */}
          <line x1={tx(0)} x2={tx(1000)} y1={186} y2={186} stroke={C.lineStrong} />
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <line x1={tx(i * 100)} x2={tx(i * 100)} y1={182} y2={190} stroke={C.lineStrong} />
              {i % 2 === 0 && (
                <text x={tx(i * 100)} y={205} textAnchor="middle" fill={C.weak} fontSize={12}>
                  {i === 10 ? "1000 ms" : i * 100}
                </text>
              )}
            </g>
          ))}
          <g key={`${cas}-${run}`}>
            {c.bars.map((b, k) => {
              const s = barStyle(b.kind);
              const y = ROW_Y[b.row];
              return (
                <motion.rect
                  key={k}
                  x={tx(b.from)}
                  y={y - 11}
                  height={22}
                  fill={s.fill}
                  fillOpacity={b.kind === "main" || b.kind === "wait" ? 0.12 : 0.16}
                  stroke={s.stroke}
                  strokeWidth={1.2}
                  strokeDasharray={b.kind === "wait" ? "4 3" : undefined}
                  initial={{ width: 0 }}
                  animate={{ width: tx(b.to) - tx(b.from) }}
                  transition={{ duration: ((b.to - b.from) / 1000) * DUREE, delay: (b.from / 1000) * DUREE, ease: "linear" }}
                />
              );
            })}
            {cas === "wg" && (
              <>
                <text x={tx(250)} y={ROW_Y.main + 5} textAnchor="middle" fill={C.text} fontSize={12}>
                  {"w.Wait() : main attend"}
                </text>
                <motion.text
                  x={tx(500) + 10}
                  y={ROW_Y.main + 5}
                  fill={C.ink}
                  fontSize={12}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 * DUREE + 0.1 }}
                >
                  {"compteur à 0 : Wait rend la main"}
                </motion.text>
              </>
            )}
            {c.dots.map((d, k) => {
              const cx = tx(d.t);
              const cy = ROW_Y[d.row];
              return (
                <motion.g
                  key={k}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (d.t / 1000) * DUREE, duration: 0.2 }}
                >
                  {d.etat === "ok" && <circle cx={cx} cy={cy} r={6} fill={C.green} />}
                  {d.etat === "perdu" && (
                    <>
                      <circle cx={cx} cy={cy} r={6} fill="none" stroke={C.red} strokeDasharray="2 2" />
                      <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke={C.red} />
                      <line x1={cx - 4} y1={cy + 4} x2={cx + 4} y2={cy - 4} stroke={C.red} />
                    </>
                  )}
                  {d.etat === "peutetre" && (
                    <>
                      <circle cx={cx} cy={cy} r={8} fill={C.orange} fillOpacity={0.2} stroke={C.orange} />
                      <text x={cx} y={cy + 4} textAnchor="middle" fill={C.ink} fontSize={12}>
                        ?
                      </text>
                    </>
                  )}
                </motion.g>
              );
            })}
            {c.fin !== undefined && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (c.fin / 1000) * DUREE }}>
                <line x1={tx(c.fin)} x2={tx(c.fin)} y1={30} y2={176} stroke={C.red} strokeWidth={1.5} strokeDasharray="5 4" />
                <text x={tx(c.fin) + 6} y={22} fill={C.red} fontSize={12}>
                  {"fin de main : tout s'arrête"}
                </text>
              </motion.g>
            )}
            <motion.g initial={{ x: 0 }} animate={{ x: tx(1000) - tx(0) }} transition={{ duration: DUREE, ease: "linear" }}>
              <line x1={tx(0)} x2={tx(0)} y1={30} y2={176} stroke={C.faint} strokeWidth={1} />
            </motion.g>
          </g>
        </svg>
        <p className="font-mono text-[13px]">
          <span className="text-fg-weak">affichage : </span>
          <span className="text-fg-strong">{c.out}</span>
          <br />
          <span className="text-fg-weak">pourquoi : </span>
          {c.why}
        </p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 2. Tampon : 10 utilisateurs, 1 imprimante à 100 ms, n places (TP Q6, Q7)
// ---------------------------------------------------------------------------

const NU = 10;
const CX0 = 180;
const CX1 = 480;
const CY = 132;
const userY = (i: number) => 12 + i * 24;

function TamponFig() {
  const [n, setN] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t >= 13 ? 0 : t + 1)), 900);
    return () => clearInterval(id);
  }, []);
  const k = Math.min(tick - 1, NU); // -1 : départ ; 0..9 : t = k × 100 ms ; 10 : fini
  const depart = k < 0;
  const partis = depart ? 0 : Math.min(NU, k + 1 + n);
  const enFile = depart ? 0 : Math.max(0, Math.min(NU - 1, k + n) - k);
  const pos = (d: number): { x: number; y: number; lieu: "user" | "file" | "imp" | "fini" } => {
    if (depart || d > k + n) return { x: 96, y: userY(d), lieu: "user" };
    if (d < k) return { x: 632 + (d % 5) * 24, y: 110 + Math.floor(d / 5) * 26, lieu: "fini" };
    if (d === k) return { x: 550, y: 124, lieu: "imp" };
    const j = d - k - 1;
    return { x: CX1 - (j + 1) * 30 + 5, y: CY - 10, lieu: "file" };
  };
  const resume =
    n === 0
      ? "1 seul part tout de suite : celui dont l'imprimante prend le document (rendez-vous)."
      : n >= 9
        ? "Les 10 partent d'un coup : chacun dépose et repart."
        : `${n + 1} partent d'un coup (${n} dans la file + 1 dans l'imprimante), puis un départ après chaque « terminée ».`;
  return (
    <Figure caption="10 utilisateurs envoient chacun un document ; une imprimante, 100 ms par document. Vert : l'utilisateur est parti (« s'en va »). Rouge pointillé : bloqué sur son envoi. Ordre des utilisateurs fixé pour le schéma (en vrai, il change à chaque exécution).">
      <div className="space-y-4">
        <Slider
          label="Places du tampon n"
          value={n}
          min={0}
          max={10}
          onChange={(v) => {
            setN(v);
            setTick(0);
          }}
        />
        <svg viewBox="0 0 760 262" className="w-full max-w-[760px]" role="img" aria-label="Utilisateurs, channel à n places et imprimante">
          <ArrowMarkers />
          {/* utilisateurs */}
          {Array.from({ length: NU }, (_, i) => {
            const parti = !depart && i < partis;
            const bloque = !depart && !parti;
            return (
              <g key={i}>
                <rect
                  x={14}
                  y={userY(i)}
                  width={74}
                  height={20}
                  rx={3}
                  fill={C.fill}
                  stroke={parti ? C.green : bloque ? C.red : C.lineStrong}
                  strokeWidth={1.5}
                  strokeDasharray={bloque ? "4 3" : undefined}
                />
                <text x={51} y={userY(i) + 14} textAnchor="middle" fill={C.ink} fontSize={12}>
                  {`user${i}`}
                </text>
                {parti && (
                  <text x={96} y={userY(i) + 14} fill={C.green} fontSize={12}>
                    {"s'en va"}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={152} y1={CY} x2={CX0 - 4} y2={CY} stroke={C.blue} strokeWidth={1.5} markerEnd="url(#arr-blue)" />
          {/* channel */}
          <text x={(CX0 + CX1) / 2} y={98} textAnchor="middle" fill={C.ink} fontSize={13}>
            {n === 0 ? "c := make(chan Impression)" : `c := make(chan Impression, ${n})`}
          </text>
          <line x1={CX0} y1={CY} x2={CX1 - n * 30} y2={CY} stroke={C.purple} strokeWidth={2} />
          {n > 0 && (
            <g>
              <rect x={CX1 - n * 30} y={CY - 18} width={n * 30} height={36} fill={C.purple} fillOpacity={0.08} stroke={C.purple} strokeWidth={1.5} />
              {Array.from({ length: n - 1 }, (_, j) => (
                <line key={j} x1={CX1 - (j + 1) * 30} x2={CX1 - (j + 1) * 30} y1={CY - 18} y2={CY + 18} stroke={C.purple} strokeOpacity={0.5} />
              ))}
            </g>
          )}
          <text x={(CX0 + CX1) / 2} y={172} textAnchor="middle" fill={C.weak} fontSize={12}>
            {n === 0 ? "aucune place : remise en main propre" : `${n} place${n > 1 ? "s" : ""}, file FIFO`}
          </text>
          <line x1={CX1 + 4} y1={CY} x2={506} y2={CY} stroke={C.purple} strokeWidth={1.5} markerEnd="url(#arr-purple)" />
          {/* imprimante */}
          <rect x={510} y={98} width={100} height={68} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
          <text x={560} y={116} textAnchor="middle" fill={C.ink} fontSize={14}>
            epson
          </text>
          <text x={560} y={160} textAnchor="middle" fill={C.weak} fontSize={12}>
            {"100 ms"}
          </text>
          <text x={632} y={100} fill={C.ink} fontSize={12}>
            {`terminées : ${Math.max(0, k)}`}
          </text>
          {/* compteurs */}
          <text x={510} y={206} fill={C.ink} fontSize={13}>
            {depart ? "départ : chacun tente c <- doc" : k >= NU ? "t = 1000 ms : tout est imprimé" : `t = ${k * 100} ms`}
          </text>
          <text x={510} y={230} fill={C.text} fontSize={13}>
            {`partis : ${partis}/10 · en file : ${enFile}/${n}`}
          </text>
          {/* documents */}
          <g key={`n${n}`}>
            {Array.from({ length: NU }, (_, d) => {
              const p = pos(d);
              const couleur = p.lieu === "fini" ? C.green : C.blue;
              return (
                <motion.g key={d} initial={false} animate={{ x: p.x, y: p.y }} transition={{ duration: 0.5, ease: "easeInOut" }}>
                  <rect width={20} height={20} rx={2} fill={couleur} fillOpacity={p.lieu === "imp" ? 0.35 : 0.18} stroke={couleur} strokeWidth={1.5} />
                  <text x={10} y={14} textAnchor="middle" fill={C.ink} fontSize={12}>
                    {d}
                  </text>
                </motion.g>
              );
            })}
          </g>
        </svg>
        <p className="font-mono text-[13px] text-fg-strong">{resume}</p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Pipeline generateur → carre → main, avec ou sans close (CM)
// ---------------------------------------------------------------------------

const CODE_CARRE_OK = `func carre(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for v := range in {
            out <- v * v
        }
    }()
    return out
}`;

const CODE_CARRE_KO = `func carre(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        // oubli : pas de defer close(out)
        for v := range in {
            out <- v * v
        }
    }()
    return out
}`;

const ETAPES_DEBUT = ["main lit carre(generateur(1, 2, 3, 4))", "1 passe et ressort au carré : 1", "2 → 4", "3 → 9", "4 → 16"];
const ETAPES_OK = [
  ...ETAPES_DEBUT,
  "generateur a fini : defer close(out) ferme son tuyau",
  "carre voit la fermeture : son range s'arrête, il ferme sa sortie",
  "le range de main s'arrête : fin propre",
];
const ETAPES_KO = [
  ...ETAPES_DEBUT,
  "generateur ferme son tuyau : le range de carre s'arrête",
  "carre se termine sans fermer out : main attend une valeur de plus",
  "plus aucune goroutine ne peut avancer : deadlock",
];

function Bouchon({ x0, x1, y, anime }: { x0: number; x1: number; y: number; anime: boolean }) {
  return (
    <motion.g initial={{ x: anime ? x0 : x1 }} animate={{ x: x1 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
      <rect x={-4} y={y - 14} width={8} height={28} fill={C.purple} />
      <text x={0} y={y - 18} textAnchor="middle" fill={C.ink} fontSize={12}>
        close
      </text>
    </motion.g>
  );
}

function PipelineFig() {
  const [ok, setOk] = useState(true);
  return (
    <div className="space-y-3">
      <Choice
        options={[
          { value: "ok", label: "avec defer close(out)" },
          { value: "ko", label: "sans close dans carre" },
        ]}
        value={ok ? "ok" : "ko"}
        onChange={(v) => setOk(v === "ok")}
      />
      <Code lang="go" code={ok ? CODE_CARRE_OK : CODE_CARRE_KO} mark={[4]} />
      <Stepper steps={ok ? ETAPES_OK : ETAPES_KO} interval={2000}>
        {(s) => {
          const affiches = [1, 4, 9, 16].slice(0, Math.min(s, 4));
          const genFini = s >= 5;
          const carreFini = s >= (ok ? 6 : 5);
          const mainEtat: Etat = ok ? (s >= 7 ? "ok" : "normal") : s >= 6 ? "bloque" : "normal";
          return (
            <svg viewBox="0 0 740 200" className="w-full max-w-[720px]" role="img" aria-label="Pipeline generateur, carre, main">
              <ArrowMarkers />
              <Acteur x={16} y={50} w={144} h={56} label="generateur" sub={genFini ? "fini" : "1, 2, 3, 4"} etat={genFini ? "ok" : "normal"} />
              <Acteur
                x={298}
                y={50}
                w={144}
                h={56}
                label="carre"
                sub={carreFini ? (ok ? "fini, a fermé out" : "fini, sans close") : "v * v"}
                etat={carreFini ? "ok" : "normal"}
              />
              <Acteur
                x={580}
                y={50}
                w={144}
                h={56}
                label="main"
                sub={mainEtat === "bloque" ? "bloqué : attend" : mainEtat === "ok" ? "fini" : "for v := range"}
                etat={mainEtat}
              />
              {[160, 442].map((x0) => (
                <rect key={x0} x={x0} y={70} width={138} height={16} fill={C.purple} fillOpacity={0.1} stroke={C.purple} strokeWidth={1.2} />
              ))}
              <text x={229} y={104} textAnchor="middle" fill={C.weak} fontSize={12}>
                chan int
              </text>
              <text x={511} y={104} textAnchor="middle" fill={C.weak} fontSize={12}>
                out
              </text>
              {/* valeur en transit */}
              {s >= 1 && s <= 4 && (
                <g key={`v${s}`}>
                  <motion.g initial={{ x: 164, opacity: 0 }} animate={{ x: 274, opacity: [0, 1, 1, 0] }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                    <rect x={0} y={67} width={22} height={22} rx={2} fill={C.blue} fillOpacity={0.25} stroke={C.blue} />
                    <text x={11} y={82} textAnchor="middle" fill={C.ink} fontSize={12}>
                      {s}
                    </text>
                  </motion.g>
                  <motion.g
                    initial={{ x: 446, opacity: 0 }}
                    animate={{ x: 552, opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 0.8, delay: 0.75, ease: "easeInOut" }}
                  >
                    <rect x={0} y={67} width={26} height={22} rx={2} fill={C.blue} fillOpacity={0.25} stroke={C.blue} />
                    <text x={13} y={82} textAnchor="middle" fill={C.ink} fontSize={12}>
                      {s * s}
                    </text>
                  </motion.g>
                </g>
              )}
              {s >= 5 && <Bouchon key={`b1-${ok}`} x0={164} x1={278} y={78} anime={s === 5} />}
              {ok && s >= 6 && <Bouchon key="b2" x0={446} x1={560} y={78} anime={s === 6} />}
              <text x={580} y={130} fill={C.weak} fontSize={12}>
                affiche :
              </text>
              <text x={580} y={150} fill={C.ink} fontSize={14}>
                {affiches.join("  ")}
              </text>
              {!ok && s >= 7 && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <rect x={120} y={166} width={500} height={28} fill={C.red} fillOpacity={0.1} stroke={C.red} />
                  <text x={370} y={185} textAnchor="middle" fill={C.ink} fontSize={13}>
                    fatal error: all goroutines are asleep - deadlock!
                  </text>
                </motion.g>
              )}
            </svg>
          );
        }}
      </Stepper>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. select : le premier prêt gagne
// ---------------------------------------------------------------------------

type Scen = "b" | "ab" | "rien" | "def";

const CODE_SELECT = `select {
case v := <-a:
    fmt.Println("a :", v)
case v := <-b:
    fmt.Println("b :", v)
}`;
const CODE_SELECT_DEF = `select {
case v := <-a:
    fmt.Println("a :", v)
case v := <-b:
    fmt.Println("b :", v)
default:
    fmt.Println("rien de prêt")
}`;

function SelectFig() {
  const [sc, setSc] = useState<Scen>("b");
  const [run, setRun] = useState(0);
  const surA = sc === "ab";
  const surB = sc === "b" || sc === "ab";
  const sortie = sc === "b" ? "b : 7" : sc === "ab" ? "a : 1 ou b : 7" : sc === "rien" ? "(attend)" : "rien de prêt";
  const mark = sc === "b" ? [4, 5] : sc === "ab" ? [2, 3, 4, 5] : sc === "rien" ? [1] : [6, 7];
  const ligne = (y: number, label: string, actif: boolean, couleur: string) => (
    <g>
      <motion.rect
        key={`${label}-${sc}-${run}`}
        x={402}
        y={y - 12}
        width={156}
        height={24}
        rx={2}
        fill={couleur}
        stroke={actif ? couleur : C.line}
        initial={{ fillOpacity: 0 }}
        animate={{ fillOpacity: actif ? 0.2 : 0 }}
        transition={{ delay: actif ? 0.9 : 0, duration: 0.3 }}
      />
      <text x={414} y={y + 5} fill={C.ink} fontSize={13}>
        {label}
      </text>
    </g>
  );
  return (
    <Figure caption="select attend sur plusieurs channels à la fois et exécute le premier cas prêt. Plusieurs prêts : Go en choisit un au hasard. Aucun prêt : default s'il existe, sinon il bloque.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Choice
            options={[
              { value: "b" as const, label: "7 arrive sur b" },
              { value: "ab" as const, label: "a et b prêts" },
              { value: "rien" as const, label: "rien, sans default" },
              { value: "def" as const, label: "rien, avec default" },
            ]}
            value={sc}
            onChange={(v) => { setSc(v); setRun((r) => r + 1); }}
          />
          <Rejouer onClick={() => setRun((r) => r + 1)} />
        </div>
        <Code lang="go" code={sc === "def" ? CODE_SELECT_DEF : CODE_SELECT} mark={mark} />
        <svg viewBox="0 0 720 200" className="w-full max-w-[720px]" role="img" aria-label="select entre les channels a et b">
          <ArrowMarkers />
          <Acteur x={14} y={22} w={124} h={44} label="écrivain a" />
          <Acteur x={14} y={112} w={124} h={44} label="écrivain b" />
          {[44, 134].map((y) => (
            <rect key={y} x={138} y={y - 8} width={252} height={16} fill={C.purple} fillOpacity={0.1} stroke={C.purple} strokeWidth={1.2} />
          ))}
          <text x={264} y={30} textAnchor="middle" fill={C.weak} fontSize={12}>
            a
          </text>
          <text x={264} y={120} textAnchor="middle" fill={C.weak} fontSize={12}>
            b
          </text>
          <rect
            x={392}
            y={20}
            width={174}
            height={sc === "def" ? 172 : 140}
            rx={3}
            fill={C.fill}
            stroke={sc === "rien" ? C.red : C.lineStrong}
            strokeWidth={1.5}
            strokeDasharray={sc === "rien" ? "5 4" : undefined}
          />
          <text x={479} y={14} textAnchor="middle" fill={C.ink} fontSize={13}>
            select
          </text>
          {ligne(44, "case <-a", surA, C.orange)}
          {ligne(134, "case <-b", surB, sc === "ab" ? C.orange : C.green)}
          {sc === "def" && ligne(172, "default", true, C.green)}
          {sc === "ab" && (
            <motion.text key={`h${run}`} x={479} y={94} textAnchor="middle" fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              au hasard
            </motion.text>
          )}
          {sc === "rien" && (
            <text x={479} y={94} textAnchor="middle" fill={C.red} fontSize={13}>
              bloqué
            </text>
          )}
          <g key={`t-${sc}-${run}`}>
            {surA && (
              <motion.g initial={{ x: 140, opacity: 0 }} animate={{ x: 362, opacity: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                <rect x={0} y={33} width={24} height={22} rx={2} fill={C.blue} fillOpacity={0.25} stroke={C.blue} />
                <text x={12} y={48} textAnchor="middle" fill={C.ink} fontSize={12}>
                  1
                </text>
              </motion.g>
            )}
            {surB && (
              <motion.g initial={{ x: 140, opacity: 0 }} animate={{ x: 362, opacity: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                <rect x={0} y={123} width={24} height={22} rx={2} fill={C.blue} fillOpacity={0.25} stroke={C.blue} />
                <text x={12} y={138} textAnchor="middle" fill={C.ink} fontSize={12}>
                  7
                </text>
              </motion.g>
            )}
          </g>
          <line x1={568} y1={96} x2={592} y2={96} stroke={C.lineStrong} strokeWidth={1.5} markerEnd="url(#arr-lineStrong)" />
          <rect x={596} y={70} width={118} height={52} rx={3} fill="none" stroke={C.line} />
          <text x={655} y={88} textAnchor="middle" fill={C.weak} fontSize={12}>
            sortie
          </text>
          <motion.text
            key={`o-${sc}-${run}`}
            x={655}
            y={110}
            textAnchor="middle"
            fill={C.ink}
            fontSize={sc === "ab" ? 12 : 13}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: sc === "b" || sc === "ab" ? 1 : 0.2 }}
          >
            {sortie}
          </motion.text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 5. Le serveur d'impression : pret (1 place), select, ack (TP 3.4, 3.5)
// ---------------------------------------------------------------------------

const ETAPES_SERV = (cap: number) => [
  cap === 1 ? "Départ : chaque imprimante lève la main, pret <- true" : "Départ : pret <- true attend que le serveur lise",
  "Un utilisateur dépose un document dans balImp ; le serveur le lit",
  "select : première imprimante prête (au hasard si les deux), puis c1 <- imp",
  "rapide imprime 100 ms puis répond : imp.ack <- nom ; l'utilisateur part",
  cap === 1 ? "Elle lève de nouveau la main : pret <- true" : "pret <- true : elle attend que le serveur lise",
  "Fin : main ferme balImp ; le serveur sort du range et ferme c1, c2",
  cap === 1 ? "Les imprimantes voient le close et finissent ; w.Wait() rend la main" : "pret <- true bloque pour toujours : le close n'est jamais vu, deadlock",
];

function Balle({ s, cap, slot, held, idx }: { s: number; cap: number; slot: number; held: number; idx: 1 | 2 }) {
  // position de la « main levée » (une valeur dans pret) selon l'étape
  const y = idx === 1 ? 76 : 246;
  const repos = cap === 1 ? slot : held;
  if (idx === 1 && s === 2)
    return (
      <motion.circle key="pris" cy={y} r={7} fill={C.green} initial={{ cx: repos, opacity: 1 }} animate={{ cx: 392, opacity: 0 }} transition={{ duration: 0.8 }} />
    );
  if (idx === 1 && s === 3) return null;
  const anime = s === 0 || (idx === 1 && s === 4);
  return (
    <motion.circle
      key={`b${anime ? s : "r"}`}
      cy={y}
      r={7}
      fill={C.green}
      initial={{ cx: anime ? held : repos }}
      animate={{ cx: repos }}
      transition={{ duration: 0.7 }}
    />
  );
}

function ServeurFig() {
  const [cap, setCap] = useState(1);
  return (
    <div className="space-y-3">
      <Choice
        label="pret1, pret2 :"
        options={[
          { value: 1, label: "make(chan bool, 1)" },
          { value: 0, label: "make(chan bool)" },
        ]}
        value={cap}
        onChange={setCap}
      />
      <Stepper steps={ETAPES_SERV(cap)} interval={2200}>
        {(s) => {
          const fin = s >= 6;
          const dead = fin && cap === 0;
          const impEtat: Etat = fin ? (dead ? "bloque" : "ok") : "normal";
          return (
            <svg viewBox="0 0 760 318" className="w-full max-w-[760px]" role="img" aria-label="Serveur d'impression avec deux imprimantes et select">
              <ArrowMarkers />
              {/* chemin de la réponse ack */}
              <path
                d="M652 30 V12 H73 V114"
                fill="none"
                stroke={s === 3 ? C.green : C.line}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                markerEnd={s === 3 ? "url(#arr-green)" : "url(#arr-line)"}
              />
              <text x={84} y={34} fill={C.weak} fontSize={12}>
                {"ack : un channel par requête"}
              </text>
              <Acteur x={14} y={118} w={118} h={58} label="utilisateurs" sub={s === 3 ? "user s'en va" : "10 documents"} etat={s === 3 ? "ok" : "normal"} />
              <rect x={132} y={139} width={118} height={16} fill={C.purple} fillOpacity={0.1} stroke={C.purple} strokeWidth={1.2} />
              <text x={191} y={131} textAnchor="middle" fill={C.weak} fontSize={12}>
                balImp
              </text>
              <Acteur
                x={250}
                y={36}
                w={130}
                h={224}
                label="serveur"
                sub={dead ? "bloqué : Wait" : fin ? "fini" : s === 2 ? "select → rapide" : "select"}
                etat={dead ? "bloque" : fin ? "ok" : "normal"}
              />
              {/* c1, c2 */}
              <rect x={380} y={42} width={180} height={16} fill={C.purple} fillOpacity={0.1} stroke={C.purple} strokeWidth={1.2} />
              <text x={470} y={36} textAnchor="middle" fill={C.weak} fontSize={12}>
                c1
              </text>
              <rect x={380} y={212} width={180} height={16} fill={C.purple} fillOpacity={0.1} stroke={C.purple} strokeWidth={1.2} />
              <text x={470} y={206} textAnchor="middle" fill={C.weak} fontSize={12}>
                c2
              </text>
              {/* pret1, pret2 */}
              {[76, 246].map((y, k) => (
                <g key={y}>
                  <line x1={558} y1={y} x2={386} y2={y} stroke={C.orange} strokeWidth={1.5} markerEnd="url(#arr-orange)" />
                  {cap === 1 && <rect x={459} y={y - 11} width={22} height={22} fill="none" stroke={C.orange} strokeWidth={1.5} />}
                  <text x={470} y={y + 26} textAnchor="middle" fill={C.weak} fontSize={12}>
                    {`pret${k + 1} · ${cap} place`}
                  </text>
                </g>
              ))}
              <Acteur x={560} y={30} w={184} h={58} label="rapide" sub={dead ? "bloqué : pret <- true" : fin ? "fini" : "100 ms"} etat={impEtat} />
              <Acteur x={560} y={200} w={184} h={58} label="lente" sub={dead ? "bloqué : pret <- true" : fin ? "fini" : "200 ms"} etat={impEtat} />
              {/* mains levées */}
              <Balle s={s} cap={cap} slot={470} held={546} idx={1} />
              <Balle s={s} cap={cap} slot={470} held={546} idx={2} />
              {/* document */}
              {s === 1 && (
                <motion.rect
                  key="d1"
                  y={138}
                  width={18}
                  height={18}
                  rx={2}
                  fill={C.blue}
                  fillOpacity={0.3}
                  stroke={C.blue}
                  initial={{ x: 100 }}
                  animate={{ x: 300 }}
                  transition={{ duration: 0.9 }}
                />
              )}
              {s === 2 && (
                <motion.rect
                  key="d2"
                  width={18}
                  height={18}
                  rx={2}
                  fill={C.blue}
                  fillOpacity={0.3}
                  stroke={C.blue}
                  initial={{ x: 300, y: 138 }}
                  animate={{ x: [300, 392, 586], y: [138, 41, 41] }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                />
              )}
              {s === 3 && (
                <>
                  <rect x={586} y={41} width={18} height={18} rx={2} fill={C.green} fillOpacity={0.3} stroke={C.green} />
                  <motion.g
                    key="ack"
                    initial={{ x: 641, y: 23 }}
                    animate={{ x: [641, 641, 62, 62], y: [23, 5, 5, 104] }}
                    transition={{ duration: 1.5, times: [0, 0.1, 0.8, 1], delay: 0.3 }}
                  >
                    <rect width={22} height={14} rx={1} fill={C.green} fillOpacity={0.3} stroke={C.green} />
                    <path d="M0 0 L11 8 L22 0" fill="none" stroke={C.green} />
                  </motion.g>
                </>
              )}
              {/* close */}
              {s >= 5 &&
                [
                  { x: 244, y: 147 },
                  { x: 386, y: 50 },
                  { x: 386, y: 220 },
                ].map((p, k) => (
                  <motion.rect
                    key={k}
                    x={p.x - 3}
                    y={p.y - 13}
                    width={7}
                    height={26}
                    fill={C.purple}
                    initial={{ opacity: s === 5 ? 0 : 1 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: k * 0.4 }}
                  />
                ))}
              {s >= 5 && (
                <text x={191} y={176} textAnchor="middle" fill={C.ink} fontSize={12}>
                  close
                </text>
              )}
              {dead && (
                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <rect x={130} y={286} width={500} height={26} fill={C.red} fillOpacity={0.1} stroke={C.red} />
                  <text x={380} y={304} textAnchor="middle" fill={C.ink} fontSize={13}>
                    fatal error: all goroutines are asleep - deadlock!
                  </text>
                </motion.g>
              )}
            </svg>
          );
        }}
      </Stepper>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. Gantt des deux imprimantes, 0 à 800 ms (TP 3.5)
// ---------------------------------------------------------------------------

const gx = (t: number) => 110 + t * 0.68;
const DG = 3.2; // secondes d'animation pour 800 ms
const RAPIDE: [number, number][] = [0, 1, 2, 3, 4, 5].map((i) => [i * 100, (i + 1) * 100]);
const LENTE: [number, number][] = [
  [0, 200],
  [200, 400],
  [400, 600],
];

function GanttFig() {
  const [dernier, setDernier] = useState<"lente" | "rapide">("lente");
  const dix: [number, number] = dernier === "lente" ? [600, 800] : [600, 700];
  const fin = dix[1];
  const nR = dernier === "rapide" ? 7 : 6;
  const nL = dernier === "lente" ? 4 : 3;
  const barre = (key: string, [a, b]: [number, number], y: number, couleur: string, dixieme = false) => (
    <g key={key}>
      <motion.rect
        x={gx(a) + 1}
        y={y - 14}
        height={28}
        fill={couleur}
        fillOpacity={0.2}
        stroke={couleur}
        strokeWidth={dixieme ? 2 : 1.2}
        initial={{ width: 0 }}
        animate={{ width: gx(b) - gx(a) - 2 }}
        transition={{ delay: (a / 800) * DG, duration: ((b - a) / 800) * DG, ease: "linear" }}
      />
      {dixieme && (
        <motion.text
          x={(gx(a) + gx(b)) / 2}
          y={y + 5}
          textAnchor="middle"
          fill={C.ink}
          fontSize={12}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (a / 800) * DG + 0.2 }}
        >
          10e
        </motion.text>
      )}
    </g>
  );
  return (
    <Figure caption="Rapide : 100 ms par document ; lente : 200 ms. Les 10 documents sont dans le tampon dès le départ. À 600 ms, 9 sont partis et les deux imprimantes sont libres : select choisit pour le 10e.">
      <div className="space-y-4">
        <Choice
          label="le 10e document va sur :"
          options={[
            { value: "lente" as const, label: "la lente (mesuré)" },
            { value: "rapide" as const, label: "la rapide (parfois)" },
          ]}
          value={dernier}
          onChange={setDernier}
        />
        <svg viewBox="0 0 720 160" className="w-full max-w-[720px]" role="img" aria-label="Diagramme de Gantt des deux imprimantes">
          <text x={14} y={46} fill={C.ink} fontSize={14}>
            rapide
          </text>
          <text x={14} y={62} fill={C.weak} fontSize={12}>
            100 ms
          </text>
          <text x={14} y={96} fill={C.ink} fontSize={14}>
            lente
          </text>
          <text x={14} y={112} fill={C.weak} fontSize={12}>
            200 ms
          </text>
          <line x1={gx(0)} x2={gx(800)} y1={134} y2={134} stroke={C.lineStrong} />
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i}>
              <line x1={gx(i * 100)} x2={gx(i * 100)} y1={130} y2={138} stroke={C.lineStrong} />
              <text x={gx(i * 100)} y={154} textAnchor="middle" fill={C.weak} fontSize={12}>
                {i === 8 ? "800 ms" : i * 100}
              </text>
            </g>
          ))}
          <line x1={gx(600)} x2={gx(600)} y1={30} y2={130} stroke={C.faint} strokeDasharray="3 3" />
          <text x={gx(600) - 6} y={26} textAnchor="end" fill={C.weak} fontSize={12}>
            {"600 ms : les deux libres"}
          </text>
          <g key={dernier}>
            {RAPIDE.map((iv, k) => barre(`r${k}`, iv, 50, C.blue))}
            {LENTE.map((iv, k) => barre(`l${k}`, iv, 100, C.orange))}
            {barre("dix", dix, dernier === "lente" ? 100 : 50, C.purple, true)}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (fin / 800) * DG }}>
              <line x1={gx(fin)} x2={gx(fin)} y1={16} y2={130} stroke={C.green} strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={gx(fin)} y={12} textAnchor="middle" fill={C.ink} fontSize={12}>
                {`fin : ${fin === 800 ? "0,80" : "0,70"} s`}
              </text>
              <text x={gx(800) + 8} y={55} fill={C.ink} fontSize={12}>
                {`${nR} docs`}
              </text>
              <text x={gx(800) + 8} y={105} fill={C.ink} fontSize={12}>
                {`${nL} docs`}
              </text>
            </motion.g>
          </g>
        </svg>
        <p className="font-mono text-[13px] text-fg-strong">
          {dernier === "lente"
            ? "6 sur la rapide, 4 sur la lente, fin à 0,80 s : le résultat mesuré."
            : "7 sur la rapide, 3 sur la lente, fin à 0,70 s : observé parfois."}{" "}
          <span className="text-fg-weak">Une seule imprimante : environ 10 × 100 ms (mesuré 1,3 s).</span>
        </p>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// La fiche
// ---------------------------------------------------------------------------

export default function Go() {
  return (
    <>
      <Section title="L'idée">
        <Idea>
          Des goroutines travaillent en même temps et se passent des valeurs par des channels : un envoi attend qu&apos;on le lise, ou
          qu&apos;une place se libère.
        </Idea>
        <p>
          <code>go f()</code> lance <code>f</code> dans une <strong>goroutine</strong>, un fil d&apos;exécution très léger.
        </p>
        <p>
          Un <strong>channel</strong> est une file de messages typée : un tuyau où ne passent, par exemple, que des <code>int</code>.
        </p>
        <p>Toute la difficulté : savoir qui attend qui, et qui ferme quoi.</p>
      </Section>

      <Section title="go rend la main, la fin de main tue tout">
        <p>
          <code>go f()</code> lance <code>f</code> et <strong>rend la main tout de suite</strong>, sans attendre.
        </p>
        <p>
          Quand <code>main</code> se termine, le programme s&apos;arrête et <strong>tue toutes les goroutines</strong>, finies ou pas.
        </p>
        <p>
          Exemple du TP : <code>say5</code> affiche 5 lignes, en dormant 100 ms avant chacune (500 ms en tout).
        </p>
        <GoMainFig />
        <p>
          La bonne attente : un <code>sync.WaitGroup</code>. Jamais un <code>time.Sleep</code> : on devine une durée, et on finit par se
          tromper.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="font-mono text-[13px] text-fg-weak">w.Go (Go 1.25 ou plus)</p>
            <Code
              lang="go"
              mark={[3, 7]}
              code={`var w sync.WaitGroup
for i := 1; i <= 3; i++ {
    w.Go(func() {
        fmt.Println("tâche", i)
    })
}
w.Wait()`}
            />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[13px] text-fg-weak">forme classique : Add, Done</p>
            <Code
              lang="go"
              mark={[3, 5, 9]}
              code={`var w sync.WaitGroup
for i := 1; i <= 3; i++ {
    w.Add(1)
    go func() {
        defer w.Done()
        fmt.Println("tâche", i)
    }()
}
w.Wait()`}
            />
          </div>
        </div>
        <Note title="Wait garantit la fin, pas l'ordre">
          <p>Trois exécutions de la version WaitGroup (début) :</p>
          <Code
            lang="text"
            code={`0 World 0 Hello 1 Hello 1 World 2 World 2 Hello …
0 Hello 0 World 1 World 1 Hello 2 Hello 2 World …
0 Hello 0 World 1 World 1 Hello 2 Hello 2 World …`}
          />
          <p>Les deux goroutines se réveillent presque au même instant : l&apos;ordonnanceur de Go choisit laquelle affiche d&apos;abord.</p>
          <p>Pour imposer un ordre, il faut les faire communiquer : les channels.</p>
        </Note>
      </Section>

      <Section title="Les channels : rendez-vous ou tampon">
        <p>
          <strong>Sans tampon</strong>, <code>make(chan T)</code> : l&apos;envoi attend qu&apos;un lecteur prenne la valeur. C&apos;est un{" "}
          <strong>rendez-vous</strong>.
        </p>
        <p>
          <strong>Avec tampon</strong>, <code>make(chan T, n)</code> : une file de n places. L&apos;envoi ne bloque que si les n places sont
          prises.
        </p>
        <p>La lecture bloque seulement quand la file est vide.</p>
        <TamponFig />
        <p>
          La durée totale ne change pas : 1,3 s sans tampon, 1,35 s avec 10 places. Le tampon fait gagner du temps aux{" "}
          <strong>utilisateurs</strong>, pas au programme.
        </p>
        <p>
          Il n&apos;y a qu&apos;une flèche, <code>&lt;-</code>, et elle montre toujours où vont les données.
        </p>
        <table className="ftable">
          <thead>
            <tr>
              <th>écriture</th>
              <th>sens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>c &lt;- v</code>
              </td>
              <td>
                v <strong>entre</strong> dans c (envoi)
              </td>
            </tr>
            <tr>
              <td>
                <code>v := &lt;-c</code>
              </td>
              <td>
                une valeur <strong>sort</strong> de c (lecture)
              </td>
            </tr>
            <tr>
              <td>
                <code>chan&lt;- int64</code>
              </td>
              <td>channel où l&apos;on peut seulement envoyer</td>
            </tr>
            <tr>
              <td>
                <code>&lt;-chan int64</code>
              </td>
              <td>channel où l&apos;on peut seulement lire</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Fermer : close, range et deadlock">
        <p>
          <code>for v := range c</code> lit les valeurs une à une, et s&apos;arrête à la fermeture du channel.
        </p>
        <p>
          C&apos;est l&apos;<strong>écrivain</strong> qui ferme, avec <code>close(c)</code>, une seule fois.
        </p>
        <p>Le pipeline du cours : chaque étage lit son entrée, écrit sa sortie, et ferme sa sortie quand l&apos;entrée est épuisée.</p>
        <PipelineFig />
        <table className="ftable">
          <thead>
            <tr>
              <th>erreur</th>
              <th>résultat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>close(c)</code> deux fois
              </td>
              <td>
                <code>panic: close of closed channel</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>c &lt;- 5</code> après <code>close(c)</code>
              </td>
              <td>
                <code>panic: send on closed channel</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>range</code> sur un channel que personne ne ferme
              </td>
              <td>
                <code>fatal error: all goroutines are asleep - deadlock!</code>
              </td>
            </tr>
            <tr>
              <td>
                envoi sans tampon et personne ne lit (<code>power</code> puis <code>affichpower</code> appelés dans <code>main</code>)
              </td>
              <td>deadlock : power bloque sur son premier envoi</td>
            </tr>
          </tbody>
        </table>
        <p>
          Le deadlock est détecté quand <strong>toutes</strong> les goroutines sont bloquées : Go arrête alors le programme.
        </p>
      </Section>

      <Section title="select : le premier prêt gagne">
        <p>
          <code>select</code> attend sur plusieurs channels à la fois.
        </p>
        <p>
          Avec une branche <code>default</code>, il ne bloque plus : c&apos;est une simple tentative.
        </p>
        <SelectFig />
      </Section>

      <Section title="Le serveur d'impression">
        <p>
          Image du TP : une boutique. Les utilisateurs déposent au guichet (<code>balImp</code>).
        </p>
        <p>Le serveur donne chaque document à une imprimante libre.</p>
        <p>
          Chaque imprimante lève la main (<code>pret &lt;- true</code>) au départ, puis après chaque document.
        </p>
        <ServeurFig />
        <p>
          <strong>Un channel de réponse par requête.</strong> Chaque utilisateur crée son propre <code>ack</code>, le glisse dans
          l&apos;<code>Impression</code>, puis attend dessus (<code>&lt;-ack</code>).
        </p>
        <p>
          L&apos;imprimante répond avec <code>imp.ack &lt;- nom</code> : c&apos;est le même channel, comme une enveloppe retour.
        </p>
        <p>Chaque « s&apos;en va » vient alors juste après son « terminée » : c&apos;est garanti, plus seulement probable.</p>
        <GanttFig />
        <p>La rapide se libère deux fois plus souvent, donc elle reçoit plus de documents.</p>
      </Section>

      <Section title="Le code à connaître">
        <p className="font-mono text-[13px] text-fg-weak">Un écrivain, un lecteur, close et range (TP, Q3)</p>
        <Code
          lang="go"
          mark={[5, 7, 11]}
          code={`func power(x int64, n int, c chan<- int64) { // écrit seulement
    var res int64 = 1
    for i := 0; i < n; i++ {
        res *= x
        c <- res // attend que le lecteur prenne la valeur
    }
    close(c) // l'écrivain ferme, une seule fois
}

func affichpower(c <-chan int64) { // lit seulement
    for v := range c { // s'arrête au close(c)
        fmt.Println(v)
    }
}

func main() {
    c := make(chan int64) // sans tampon
    var w sync.WaitGroup
    w.Go(func() { power(2, 10, c) })
    w.Go(func() { affichpower(c) })
    w.Wait() // affiche 2, 4, 8, … 1024
}`}
        />
        <p className="font-mono text-[13px] text-fg-weak">Terminer proprement : écrivains, close, lecteur (TP 3.3)</p>
        <Code
          lang="go"
          mark={[7, 8, 9]}
          code={`c := make(chan Impression)
var wUser, wImp sync.WaitGroup
wImp.Go(func() { imprimante("epson", ImpNoirEtBlanc, 100, c) })
for i := 0; i < 10; i++ {
    wUser.Go(func() { utilisateur("user"+strconv.Itoa(i), ImpNoirEtBlanc, c) })
}
wUser.Wait() // 1. tous les utilisateurs ont déposé
close(c)     // 2. plus personne n'écrit : l'imprimante sort de son range
wImp.Wait()  // 3. l'imprimante a fini`}
        />
        <p className="font-mono text-[13px] text-fg-weak">Channel de réponse (TP 3.4)</p>
        <Code
          lang="go"
          mark={[2, 4]}
          code={`func utilisateur(nom string, t TImpression, balImp chan<- Impression) {
    ack := make(chan string)          // boîte retour, vide
    balImp <- Impression{nom, t, ack} // la boîte part avec le document
    imp := <-ack                      // attend que l'imprimante écrive dedans
    fmt.Println(nom, "s'en va, imprimé sur", imp)
}
// dans imprimante, après le if/else de chaque tour :
//     imp.ack <- nom`}
        />
        <p className="font-mono text-[13px] text-fg-weak">Serveur avec select (TP 3.5)</p>
        <Code
          lang="go"
          mark={[2, 5, 11, 16, 17, 18, 19, 20, 21]}
          code={`func imprimante(nom string, t TImpression, vitesse int, balImp <-chan Impression, pret chan<- bool) {
    pret <- true // libre dès le départ
    for imp := range balImp {
        // … impression, puis imp.ack <- nom …
        pret <- true // de nouveau libre
    }
}

func serveur(balImp <-chan Impression) {
    c1, c2 := make(chan Impression), make(chan Impression)
    pret1, pret2 := make(chan bool, 1), make(chan bool, 1) // 1 place
    var w sync.WaitGroup
    w.Go(func() { imprimante("rapide", ImpNoirEtBlanc, 100, c1, pret1) })
    w.Go(func() { imprimante("lente", ImpNoirEtBlanc, 200, c2, pret2) })
    for imp := range balImp {
        select { // la première imprimante libre
        case <-pret1:
            c1 <- imp
        case <-pret2:
            c2 <- imp
        }
    }
    close(c1) // plus de documents
    close(c2)
    w.Wait()
}`}
        />
        <Note title="Erreurs de compilation rencontrées au TP">
          <ul className="flist">
            <li>
              <code>import &quot;channel&quot;</code> : rien à importer, <code>chan</code> fait partie du langage.
            </li>
            <li>
              <code>c := make(...)</code> hors d&apos;une fonction : interdit, <code>:=</code> ne s&apos;utilise que dans une fonction.
            </li>
            <li>
              <code>fmt.println</code> : il faut <code>fmt.Println</code> (majuscule pour ce qui vient d&apos;un autre package).
            </li>
            <li>
              <code>&quot;sync&quot; imported and not used</code> : un import inutilisé est une erreur de compilation.
            </li>
            <li>
              <code>w.Go</code> n&apos;existe qu&apos;à partir de Go 1.25 (le conteneur Docker, en Go 1.18, le refuse).
            </li>
          </ul>
        </Note>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>
            <code>go</code> rend la main tout de suite ; la fin de <code>main</code> tue toutes les goroutines.
          </li>
          <li>
            <code>WaitGroup</code> (<code>w.Go</code>, ou <code>Add</code>/<code>Done</code>, puis <code>Wait</code>) attend la fin, sans
            garantir d&apos;ordre. Jamais <code>time.Sleep</code>.
          </li>
          <li>Sans tampon : rendez-vous. Avec n places : l&apos;envoi bloque si la file est pleine, la lecture si elle est vide.</li>
          <li>
            L&apos;écrivain ferme, une seule fois ; <code>range</code> lit jusqu&apos;au <code>close</code>.
          </li>
          <li>
            <code>select</code> : premier cas prêt ; plusieurs prêts, au hasard ; <code>default</code> : ne bloque pas.
          </li>
          <li>Pour terminer : attendre les écrivains, fermer, puis attendre le lecteur.</li>
          <li>Un channel de réponse par requête : la réponse arrive exactement à celui qui l&apos;attend.</li>
        </Points>
        <Trap title="Piège : un WaitGroup sans close">
          <p>
            <code>w.Go</code> pour l&apos;utilisateur et pour l&apos;imprimante, puis <code>w.Wait()</code>, sans <code>close(c)</code>.
          </p>
          <p>
            Résultat : « Margot s&apos;en va », « … terminée », puis <code>fatal error: all goroutines are asleep - deadlock!</code>
          </p>
          <p>
            L&apos;imprimante reste dans son <code>range</code>, qui n&apos;attend que le <code>close</code>. Personne ne ferme :{" "}
            <code>Wait</code> l&apos;attend pour toujours.
          </p>
        </Trap>
        <Reveal
          question={
            <p>
              <code>main</code> exécute <code>go say5(&quot;Hello&quot;)</code> puis <code>say5(&quot;World&quot;)</code>. Combien de lignes
              s&apos;affichent ? Pourquoi ?
            </p>
          }
        >
          <p>9 ou 10, mélangées.</p>
          <p>
            World tourne dans <code>main</code> pendant que Hello tourne à côté. Les deux <code>[4]</code> arrivent à 500 ms.
          </p>
          <p>
            Si World affiche le sien d&apos;abord, <code>main</code> se termine et tue la goroutine : <code>[4] Hello</code> est perdu.
          </p>
        </Reveal>
        <Reveal
          question={
            <p>
              10 utilisateurs, une imprimante à 100 ms, <code>c := make(chan Impression, 3)</code>. Combien d&apos;utilisateurs partent tout
              de suite ? La durée totale change-t-elle ?
            </p>
          }
        >
          <p>4 : 3 documents dans la file, plus 1 pris par l&apos;imprimante. Ensuite, un départ après chaque impression.</p>
          <p>
            La durée ne change pas (environ 10 × 100 ms) : l&apos;imprimante fait toujours seule les 10 impressions. Le tampon fait gagner du
            temps aux utilisateurs, pas au programme.
          </p>
        </Reveal>
        <Reveal
          question={
            <p>
              Dans le serveur, pourquoi <code>pret1 := make(chan bool, 1)</code> et pas <code>make(chan bool)</code> ?
            </p>
          }
        >
          <p>
            Après son dernier document, l&apos;imprimante fait encore <code>pret &lt;- true</code>, mais le serveur ne lit plus{" "}
            <code>pret</code>.
          </p>
          <p>
            Sans place, elle bloque sur cet envoi, n&apos;atteint jamais le <code>range</code> qui verrait le <code>close</code>, et le{" "}
            <code>w.Wait()</code> du serveur l&apos;attend pour toujours : deadlock.
          </p>
          <p>Une place suffit : une imprimante ne dit jamais deux fois « libre » de suite sans recevoir un document entre les deux.</p>
        </Reveal>
      </Section>
    </>
  );
}
