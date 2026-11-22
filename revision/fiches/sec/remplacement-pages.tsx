"use client";
// Fiche CM10 Remplacement de pages : exercice du cours (3 cases, suite 1 2 3 2 1 4 2 1 5 2),
// horloge, temps d'accès moyen (80 ns, défaut de 5 ms à 75 % ou 15 ms à 25 %), écroulement.
import { useState } from "react";
import { ArrowMarkers, C, Choice, Figure, Formula, Idea, Points, Reveal, Section, Slider, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// Simulation des algorithmes sur la suite du cours
// ---------------------------------------------------------------------------

type Algo = "fifo" | "lru" | "clock" | "opt";
const REFS = [1, 2, 3, 2, 1, 4, 2, 1, 5, 2];
const NC = 3; // nombre de cases

interface Snap {
  t: number;
  ref: number;
  frames: (number | null)[];
  fault: boolean;
  slot: number;
  faults: number;
  note: (string | null)[]; // état affiché à côté de chaque case
  hand: number; // aiguille (horloge)
  label: string;
}

function nextUse(page: number, k: number): number {
  const j = REFS.indexOf(page, k + 1);
  return j < 0 ? Infinity : j + 1;
}

function simulate(algo: Algo): Snap[] {
  const frames: (number | null)[] = [null, null, null];
  const queue: number[] = []; // cases dans l'ordre de chargement (FIFO)
  const last = [0, 0, 0]; // instant de dernière utilisation (LRU)
  const bits = [0, 0, 0]; // bit d'utilisation (horloge)
  let hand = 0;
  let faults = 0;
  const out: Snap[] = [];
  REFS.forEach((ref, k) => {
    const t = k + 1;
    let slot = frames.indexOf(ref);
    let fault = false;
    let victim: number | null = null;
    const chances: number[] = [];
    let why = "";
    if (slot >= 0) {
      last[slot] = t;
      bits[slot] = 1;
    } else {
      fault = true;
      faults++;
      if (algo === "clock") {
        for (let g = 0; g < 2 * NC + 1; g++) {
          const p = frames[hand];
          if (p === null) break;
          if (bits[hand] === 1) {
            bits[hand] = 0;
            chances.push(p);
            hand = (hand + 1) % NC;
          } else {
            victim = p;
            break;
          }
        }
        slot = hand;
        hand = (hand + 1) % NC;
      } else {
        const free = frames.indexOf(null);
        if (free >= 0) slot = free;
        else if (algo === "fifo") {
          slot = queue.shift() ?? 0;
          why = "tête de file";
        } else if (algo === "lru") {
          slot = last.indexOf(Math.min(...last));
          why = `utilisée à t=${last[slot]}`;
        } else {
          const nu = frames.map((p) => (p === null ? -1 : nextUse(p, k)));
          slot = nu.indexOf(Math.max(...nu));
          why = nu[slot] === Infinity ? "plus jamais utilisée" : `prochaine utilisation la plus lointaine : t=${nu[slot]}`;
        }
        victim = free >= 0 ? null : frames[slot];
      }
      if (algo === "fifo") queue.push(slot);
      frames[slot] = ref;
      last[slot] = t;
      bits[slot] = 1;
    }

    let label: string;
    if (!fault) {
      const suffix = algo === "fifo" ? " (la file ne bouge pas)" : algo === "lru" ? ` (son instant passe à ${t})` : algo === "clock" ? " (son bit passe à 1)" : "";
      label = `t=${t} : ${ref} présente → pas de défaut${suffix}`;
    } else if (victim === null) {
      label = `t=${t} : ${ref} absente → défaut, case libre`;
    } else if (algo === "clock") {
      label = chances.length
        ? `t=${t} : ${ref} absente → défaut ; seconde chance pour ${chances.join(", ")} ; victime ${victim}`
        : `t=${t} : ${ref} absente → défaut ; victime ${victim} (bit 0)`;
    } else {
      label = `t=${t} : ${ref} absente → défaut, on chasse ${victim} (${why})`;
    }

    const note = frames.map((p, s) => {
      if (p === null) return null;
      if (algo === "fifo") return `${queue.indexOf(s) + 1}${queue.indexOf(s) === 0 ? "er (tête)" : "e"}`;
      if (algo === "lru") return `t=${last[s]}`;
      if (algo === "clock") return `bit ${bits[s]}`;
      const nu = nextUse(p, k);
      return nu === Infinity ? "jamais" : `→ t=${nu}`;
    });
    out.push({ t, ref, frames: [...frames], fault, slot, faults, note, hand, label });
  });
  return out;
}

const SIMS: Record<Algo, Snap[]> = {
  fifo: simulate("fifo"),
  lru: simulate("lru"),
  clock: simulate("clock"),
  opt: simulate("opt"),
};

const NOTE_TITLE: Record<Algo, string> = {
  fifo: "ordre de chargement",
  lru: "dernière utilisation",
  clock: "bit d'utilisation",
  opt: "prochaine utilisation",
};

const COLX = (k: number) => 86 + k * 54;
const ROWY = [106, 146, 186]; // lignes de base des cases

function Table({ algo, i }: { algo: Algo; i: number }) {
  const sim = SIMS[algo];
  const cur = sim[i];
  return (
    <svg viewBox="0 0 800 290" className="w-full max-w-[800px]" role="img" aria-label="Tableau des défauts de page">
      <ArrowMarkers />
      {/* colonne courante */}
      <motion.rect initial={false} animate={{ x: COLX(i) }} y={12} width={54} height={226} fill={C.blue} fillOpacity={0.1} />
      {["t", "réf.", "case 0", "case 1", "case 2", "défaut"].map((l, r) => (
        <text key={l} x={14} y={[32, 66, 106, 146, 186, 224][r]} fill={C.weak} fontSize={12}>
          {l}
        </text>
      ))}
      {REFS.map((ref, k) => (
        <g key={k}>
          <text x={COLX(k) + 27} y={32} textAnchor="middle" fill={C.faint} fontSize={12}>
            {k + 1}
          </text>
          <text x={COLX(k) + 27} y={66} textAnchor="middle" fill={k === i ? C.ink : C.text} fontSize={15} fontWeight={k === i ? 600 : 400}>
            {ref}
          </text>
        </g>
      ))}
      {sim.slice(0, i + 1).map((s, k) => (
        <motion.g key={`${algo}-${k}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {s.frames.map((p, r) => {
            const changed = r === s.slot;
            const col = changed ? (s.fault ? C.orange : C.green) : C.lineStrong;
            return (
              <g key={r}>
                <rect
                  x={COLX(k) + 4}
                  y={ROWY[r] - 21}
                  width={46}
                  height={30}
                  fill={changed && s.fault ? C.orange : C.fill}
                  fillOpacity={changed && s.fault ? 0.2 : 1}
                  stroke={col}
                  strokeWidth={changed ? 1.5 : 1}
                />
                {p !== null && (
                  <text x={COLX(k) + 27} y={ROWY[r]} textAnchor="middle" fill={changed ? C.ink : C.text} fontSize={14}>
                    {p}
                  </text>
                )}
              </g>
            );
          })}
          <text x={COLX(k) + 27} y={226} textAnchor="middle" fill={s.fault ? C.red : C.green} fontSize={14}>
            {s.fault ? "✗" : "✓"}
          </text>
        </motion.g>
      ))}

      {/* état de l'algorithme */}
      <text x={640} y={66} fill={C.weak} fontSize={12}>
        {NOTE_TITLE[algo]}
      </text>
      {cur.note.map((n, r) => (
        <motion.text key={`${algo}-${i}-${r}`} x={640} y={ROWY[r]} fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {n ?? "—"}
        </motion.text>
      ))}
      {algo === "clock" && (
        <motion.text initial={false} animate={{ y: ROWY[cur.hand] }} x={712} fill={C.purple} fontSize={13}>
          ◀ aiguille
        </motion.text>
      )}

      <text x={14} y={274} fill={C.weak} fontSize={13}>
        défauts :
      </text>
      <motion.text key={`${algo}-${cur.faults}`} x={100} y={276} fill={C.red} fontSize={22} fontWeight={600} initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }}>
        {cur.faults}
      </motion.text>
      {i === REFS.length - 1 && (
        <motion.text x={140} y={274} fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          bilan : {cur.faults} défauts sur 10 références
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// L'horloge : l'exemple du cours
// ---------------------------------------------------------------------------

const CLK = { cx: 170, cy: 150, r: 96 };
const CASE_POS = [0, 1, 2].map((j) => {
  const a = ((-90 + j * 120) * Math.PI) / 180;
  return { x: CLK.cx + CLK.r * Math.cos(a), y: CLK.cy + CLK.r * Math.sin(a) };
});
const CLOCK_STEPS = [
  { label: "Défaut sur 4 : pages 1, 2, 3, bits 1, 1, 0, aiguille sur la page 1", pages: [1, 2, 3], bits: [1, 1, 0], rot: 0, victim: -1 },
  { label: "Page 1 : bit 1 → remis à 0, l'aiguille passe (seconde chance)", pages: [1, 2, 3], bits: [0, 1, 0], rot: 120, victim: -1 },
  { label: "Page 2 : bit 1 → remis à 0, l'aiguille passe", pages: [1, 2, 3], bits: [0, 0, 0], rot: 240, victim: -1 },
  { label: "Page 3 : bit 0 → c'est la victime", pages: [1, 2, 3], bits: [0, 0, 0], rot: 240, victim: 2 },
  { label: "4 prend sa place avec le bit 1 ; l'aiguille avance d'une case", pages: [1, 2, 4], bits: [0, 0, 1], rot: 360, victim: -1 },
];

function Horloge({ i }: { i: number }) {
  const st = CLOCK_STEPS[i];
  return (
    <svg viewBox="0 0 660 300" className="w-full max-w-[660px]" role="img" aria-label="Algorithme de l'horloge">
      <ArrowMarkers />
      <circle cx={CLK.cx} cy={CLK.cy} r={CLK.r} fill="none" stroke={C.line} strokeDasharray="4 5" />
      {/* aiguille : rotation CSS autour du centre de l'horloge */}
      <g style={{ transform: `rotate(${st.rot}deg)`, transformOrigin: `${CLK.cx}px ${CLK.cy}px`, transformBox: "view-box", transition: "transform 0.8s ease-in-out" }}>
        <line x1={CLK.cx} y1={CLK.cy} x2={CLK.cx} y2={CLK.cy - 58} stroke={C.purple} strokeWidth={3} markerEnd="url(#arr-purple)" />
      </g>
      <circle cx={CLK.cx} cy={CLK.cy} r={5} fill={C.purple} />
      {CASE_POS.map((p, j) => {
        const isVictim = st.victim === j;
        const fresh = i === 4 && j === 2;
        const col = isVictim ? C.red : fresh ? C.orange : st.bits[j] ? C.blue : C.lineStrong;
        return (
          <g key={j}>
            <rect x={p.x - 46} y={p.y - 26} width={92} height={52} fill={C.paper} stroke={col} strokeWidth={isVictim || fresh ? 2.5 : 1.5} />
            <motion.text key={`p${st.pages[j]}`} x={p.x} y={p.y - 4} textAnchor="middle" fill={C.ink} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              page {st.pages[j]}
            </motion.text>
            <motion.text key={`b${j}-${st.bits[j]}`} x={p.x} y={p.y + 16} textAnchor="middle" fill={st.bits[j] ? C.blue : C.weak} fontSize={13} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              bit {st.bits[j]}
            </motion.text>
          </g>
        );
      })}
      <text x={340} y={60} fill={C.ink} fontSize={14}>
        page demandée : 4
      </text>
      {[
        { t: "bit à 1 → mis à 0, l'aiguille avance", on: i === 1 || i === 2 },
        { t: "bit à 0 → victime", on: i === 3 },
        { t: "page chargée : bit 1, l'aiguille avance", on: i === 4 },
      ].map((r, k) => (
        <g key={k}>
          <rect x={334} y={88 + k * 40} width={318} height={30} fill={r.on ? C.purple : C.fill} fillOpacity={r.on ? 0.15 : 1} stroke={r.on ? C.purple : C.line} />
          <text x={346} y={108 + k * 40} fill={r.on ? C.ink : C.text} fontSize={13}>
            {r.t}
          </text>
        </g>
      ))}
      <text x={340} y={240} fill={C.weak} fontSize={12}>
        exemple hypothétique du cours
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Temps d'accès moyen
// ---------------------------------------------------------------------------

type Scale = "zoom" | "large";
const T_DEF = 7_500_000; // ns
const T = (p: number) => 80 + p * T_DEF;
const P_STAR = 40 / T_DEF;

function fmtP(p: number): string {
  if (p === 0) return "0";
  const e = Math.floor(Math.log10(p));
  return `${(p / 10 ** e).toFixed(1).replace(".", ",")}e${e}`;
}
const fmtNs = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

function Acces({ scale, f }: { scale: Scale; f: number }) {
  const pmax = scale === "zoom" ? 1e-5 : 1e-3;
  const tmax = scale === "zoom" ? 160 : 8000;
  const p = (f / 100) * pmax;
  const x = (pp: number) => 80 + (pp / pmax) * 520;
  const y = (tt: number) => 230 - (tt / tmax) * 190;
  const tv = T(p);
  const ok = tv < 120;
  const yt = scale === "zoom" ? [0, 40, 80, 120, 160] : [0, 2000, 4000, 6000, 8000];
  const xt = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox="0 0 640 290" className="w-full max-w-[640px]" role="img" aria-label="Temps d'accès moyen en fonction du taux de défauts">
      <line x1={80} y1={230} x2={610} y2={230} stroke={C.lineStrong} />
      <line x1={80} y1={230} x2={80} y2={34} stroke={C.lineStrong} />
      {yt.map((v) => (
        <g key={v}>
          <line x1={76} y1={y(v)} x2={600} y2={y(v)} stroke={C.line} strokeDasharray="2 4" />
          <text x={70} y={y(v) + 4} textAnchor="end" fill={C.weak} fontSize={12}>
            {fmtNs(v)}
          </text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={v} x={x(v * pmax)} y={248} textAnchor="middle" fill={C.weak} fontSize={12}>
          {scale === "zoom" ? String(v * 10).replace(".", ",") : String(v).replace(".", ",")}
        </text>
      ))}
      <text x={600} y={266} textAnchor="end" fill={C.faint} fontSize={12}>
        p ({scale === "zoom" ? "× 10⁻⁶" : "× 10⁻³"})
      </text>
      <text x={14} y={24} fill={C.faint} fontSize={12}>
        T (ns)
      </text>
      {/* seuil 120 ns */}
      <line x1={80} y1={y(120)} x2={600} y2={y(120)} stroke={C.red} strokeDasharray="6 4" />
      <text x={598} y={y(120) - 6} textAnchor="end" fill={C.red} fontSize={12}>
        120 ns
      </text>
      {scale === "zoom" && (
        <g>
          <line x1={x(P_STAR)} y1={230} x2={x(P_STAR)} y2={y(120)} stroke={C.red} strokeDasharray="3 3" />
          <text x={x(P_STAR) + 4} y={222} fill={C.red} fontSize={12}>
            p* ≈ 5,3
          </text>
        </g>
      )}
      <line x1={x(0)} y1={y(T(0))} x2={x(pmax)} y2={y(T(pmax))} stroke={C.blue} strokeWidth={2} />
      <motion.circle initial={false} animate={{ cx: x(p), cy: y(tv) }} r={7} fill={ok ? C.green : C.red} />
      <text x={96} y={58} fill={ok ? C.green : C.red} fontSize={14}>
        T = 80 + p × 7 500 000 = {tv < 1000 ? tv.toFixed(1).replace(".", ",") : fmtNs(tv)} ns {ok ? "< 120 ✓" : "≥ 120 ✗"}
      </text>
      <text x={96} y={80} fill={C.weak} fontSize={12}>
        p = {fmtP(p)}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// L'écroulement (schéma qualitatif du cours)
// ---------------------------------------------------------------------------

const U = (n: number) => (n <= 5 ? 1 - 0.7 ** n : (1 - 0.7 ** 5) * Math.exp(-0.5 * (n - 5)));
const PROC_COLORS = [C.blue, C.orange, C.green, C.purple, C.cyan, C.red, C.yellow];

function Ecroulement({ n }: { n: number }) {
  const gx = (k: number) => 80 + (k - 1) * 46;
  const gy = (u: number) => 240 - u * 130;
  const pts = Array.from({ length: 12 }, (_, k) => `${gx(k + 1)},${gy(U(k + 1))}`).join(" ");
  const per = 12 / n;
  return (
    <svg viewBox="0 0 640 280" className="w-full max-w-[640px]" role="img" aria-label="Écroulement : utilisation du processeur selon le nombre de processus">
      <text x={20} y={22} fill={C.weak} fontSize={12}>
        12 cases de mémoire
      </text>
      {Array.from({ length: 12 }, (_, j) => {
        const owner = Math.floor((j * n) / 12);
        const col = PROC_COLORS[owner % PROC_COLORS.length];
        return <rect key={j} x={20 + j * 50} y={30} width={46} height={30} fill={col} fillOpacity={0.35} stroke={C.lineStrong} />;
      })}
      <text x={20} y={84} fill={C.ink} fontSize={13}>
        {n} processus → {Number.isInteger(per) ? per : per.toFixed(1).replace(".", ",")} case{per >= 2 ? "s" : ""} chacun
      </text>
      <line x1={70} y1={240} x2={610} y2={240} stroke={C.lineStrong} />
      <line x1={70} y1={240} x2={70} y2={100} stroke={C.lineStrong} />
      <text x={76} y={108} fill={C.faint} fontSize={12}>
        utilisation du processeur (schéma)
      </text>
      {Array.from({ length: 12 }, (_, k) => (
        <text key={k} x={gx(k + 1)} y={258} textAnchor="middle" fill={C.weak} fontSize={12}>
          {k + 1}
        </text>
      ))}
      <text x={610} y={274} textAnchor="end" fill={C.faint} fontSize={12}>
        nombre de processus
      </text>
      <polyline points={pts} fill="none" stroke={C.blue} strokeWidth={2} />
      <motion.circle initial={false} animate={{ cx: gx(n), cy: gy(U(n)) }} r={7} fill={n > 5 ? C.red : C.green} />
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function RemplacementPages() {
  const [algo, setAlgo] = useState<Algo>("fifo");
  const [scale, setScale] = useState<Scale>("zoom");
  const [f, setF] = useState(53);
  const [n, setN] = useState(3);
  const sim = SIMS[algo];
  return (
    <>
      <Section title="L'idée">
        <Idea>Défaut de page et mémoire pleine : il faut chasser une page, la victime. Tout l'art est de chasser celle dont on aura besoin le plus tard.</Idea>
        <p>Un défaut de page survient quand la page demandée n'est dans aucune case.</p>
        <table className="ftable">
          <thead>
            <tr>
              <th>Algorithme</th>
              <th>Victime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Optimal</td>
              <td>la page dont la prochaine utilisation est la plus lointaine. Irréalisable (il faut connaître le futur) : sert de référence.</td>
            </tr>
            <tr>
              <td>FIFO</td>
              <td>la page chargée depuis le plus longtemps</td>
            </tr>
            <tr>
              <td>LRU</td>
              <td>la page utilisée le moins récemment</td>
            </tr>
            <tr>
              <td>Horloge</td>
              <td>approche LRU avec un seul bit d'utilisation par case</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="L'exercice : FIFO contre LRU">
        <p>
          3 cases. Suite de références : <strong>1, 2, 3, 2, 1, 4, 2, 1, 5, 2</strong>. Combien de défauts ?
        </p>
        <Choice
          label="Algorithme"
          options={[
            { value: "fifo", label: "FIFO" },
            { value: "lru", label: "LRU" },
            { value: "clock", label: "Horloge" },
            { value: "opt", label: "Optimal" },
          ]}
          value={algo}
          onChange={setAlgo}
        />
        <Stepper
          steps={sim.map((s) => s.label)}
          interval={2200}
          caption="Une colonne par référence, une ligne par case. Orange : page chargée (défaut). Vert : page présente. Corrigé du cours : FIFO 7 défauts, LRU 5. Horloge (7) et optimal (5) : calculés avec les règles du cours."
        >
          {(i) => <Table algo={algo} i={i} />}
        </Stepper>
        <Trap title="L'erreur classique, à l'instant 6">
          <p>Les cases contiennent 1, 2, 3 et la page 4 arrive. LRU ne regarde pas l'ordre de chargement, mais la dernière utilisation.</p>
          <table className="ftable">
            <thead>
              <tr>
                <th>page</th>
                <th>chargée à</th>
                <th>dernière utilisation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>t=1 (FIFO la chasserait)</td>
                <td>t=5</td>
              </tr>
              <tr>
                <td>2</td>
                <td>t=2</td>
                <td>t=4</td>
              </tr>
              <tr>
                <td>3</td>
                <td>t=3</td>
                <td>
                  <strong>t=3 → victime LRU</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p>Chasser 1, c'est FIFO déguisé : 1 est redemandée à t=8, défaut inutile.</p>
        </Trap>
      </Section>

      <Section title="L'horloge (seconde chance)">
        <p>Dater chaque accès (LRU) demande une aide matérielle coûteuse. L'horloge garde un seul bit par case, mis à 1 à chaque accès.</p>
        <Stepper steps={CLOCK_STEPS.map((s) => s.label)} interval={2200}>
          {(i) => <Horloge i={i} />}
        </Stepper>
      </Section>

      <Section title="Temps d'accès moyen">
        <Formula>T = t_mém + p × t_défaut</Formula>
        <p>p : probabilité qu'un accès provoque un défaut. Énoncé : t_mém = 80 ns ; un défaut coûte 5 ms (3 fois sur 4) ou 15 ms (1 fois sur 4).</p>
        <Formula>t_défaut = 0,75 × 5 + 0,25 × 15 = 3,75 + 3,75 = 7,5 ms = 7 500 000 ns</Formula>
        <Figure caption="T < 120 ns ⇔ p × 7 500 000 < 40 ⇔ p < 40 / 7 500 000 ≈ 5,3 × 10⁻⁶ : au plus un défaut pour environ 190 000 accès. À p = 10⁻³, T ≈ 7 580 ns, près de 100 fois plus lent.">
          <div className="space-y-4">
            <Choice
              label="Échelle"
              options={[
                { value: "zoom", label: "p ≤ 10⁻⁵ (zoom)" },
                { value: "large", label: "p ≤ 10⁻³" },
              ]}
              value={scale}
              onChange={setScale}
            />
            <Slider label="p" value={f} min={0} max={100} onChange={setF} format={(v) => fmtP((v / 100) * (scale === "zoom" ? 1e-5 : 1e-3))} />
            <Acces scale={scale} f={f} />
          </div>
        </Figure>
      </Section>

      <Section title="L'écroulement">
        <p>Trop de processus pour la mémoire : chacun a moins de cases, donc plus de défauts, et p grimpe.</p>
        <p>Les processus attendent le disque, le processeur reste inactif. On l'évite en réduisant le nombre de processus en mémoire.</p>
        <Figure caption="Schéma qualitatif (sans graduation) : au-delà d'un certain nombre de processus, le système ne fait presque plus que paginer.">
          <div className="space-y-4">
            <Slider label="processus" value={n} min={1} max={12} onChange={setN} />
            <Ecroulement n={n} />
          </div>
        </Figure>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Méthode : un tableau, une colonne par référence, et un état tenu à jour.</li>
          <li>FIFO : la file de chargement ; un accès réussi ne la modifie pas.</li>
          <li>LRU : l'instant de dernière utilisation, mis à jour à chaque accès.</li>
          <li>Horloge : un bit par case ; bit 1 → remis à 0 et on avance ; bit 0 → victime.</li>
          <li>T = t_mém + p × t_défaut : tout convertir en ns, puis isoler p.</li>
          <li>Écroulement : trop de processus, trop de défauts, processeur inactif.</li>
        </Points>
        <Trap title="Piège d'unités">
          <p>7,5 ms = 7 500 000 ns, pas 7 500. Une erreur d'unité décale p d'un facteur 1000.</p>
        </Trap>
        <Reveal question={<p>3 cases, suite 1, 2, 3, 2, 1, 4, 2, 1, 5, 2. Défauts avec FIFO ? Avec LRU ?</p>}>
          <p>
            <strong>FIFO : 7 défauts.</strong> 4 chasse 1, puis 1 chasse 2, 5 chasse 3, le dernier 2 chasse 4.
          </p>
          <p>
            <strong>LRU : 5 défauts.</strong> 4 chasse 3 (utilisée à t=3), puis 5 chasse 4 (utilisée à t=6).
          </p>
        </Reveal>
        <Reveal question={<p>t_mém = 80 ns, un défaut coûte 5 ms (p = 0,75) ou 15 ms (p = 0,25). Quel taux de défauts pour rester sous 120 ns ?</p>}>
          <p>t_défaut = 0,75 × 5 + 0,25 × 15 = 7,5 ms = 7 500 000 ns.</p>
          <p>
            80 + p × 7 500 000 &lt; 120 ⇔ p &lt; 40 / 7 500 000 ≈ <strong>5,3 × 10⁻⁶</strong>, soit au plus un défaut pour environ 190 000 accès.
          </p>
        </Reveal>
        <Reveal question={<p>Pourquoi l'algorithme optimal n'est-il pas utilisé en vrai ?</p>}>
          <p>Il chasse la page dont la prochaine utilisation est la plus lointaine : il faudrait connaître le futur. Il sert seulement de référence pour comparer.</p>
        </Reveal>
      </Section>
    </>
  );
}
