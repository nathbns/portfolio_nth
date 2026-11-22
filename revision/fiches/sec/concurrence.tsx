"use client";
// Fiche CM3 Concurrence : compteur++ non atomique, entrelacements, section critique, Peterson, interblocage.
import { useState } from "react";
import { ArrowMarkers, C, Choice, Code, Figure, Idea, Points, Reveal, Section, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// Simulation de deux compteur++ (lire, +1, écrire) selon un ordre de créneaux
// ---------------------------------------------------------------------------

type Th = 1 | 2;
type Act = 0 | 1 | 2; // 0 lire, 1 +1, 2 écrire
const ACT = ["lire", "+1", "écrire"] as const;

interface Sim {
  slots: { th: Th; act: Act }[];
  states: { mem: number; r1: number | null; r2: number | null }[];
  result: number;
}

function simulate(order: Th[], start = 5): Sim {
  const done: Record<Th, number> = { 1: 0, 2: 0 };
  const reg: Record<Th, number | null> = { 1: null, 2: null };
  let mem = start;
  const slots: Sim["slots"] = [];
  const states: Sim["states"] = [];
  for (const th of order) {
    const act = done[th] as Act;
    done[th] += 1;
    if (act === 0) reg[th] = mem;
    else if (act === 1) reg[th] = (reg[th] ?? 0) + 1;
    else mem = reg[th] ?? 0;
    slots.push({ th, act });
    states.push({ mem, r1: reg[1], r2: reg[2] });
  }
  return { slots, states, result: mem };
}

// Les 20 entrelacements : positions de T1 parmi 6 créneaux, ordre lexicographique.
const COMBOS: { pos: number[]; order: Th[]; sim: Sim }[] = [];
for (let a = 0; a < 6; a++)
  for (let b = a + 1; b < 6; b++)
    for (let c = b + 1; c < 6; c++) {
      const order: Th[] = [0, 1, 2, 3, 4, 5].map((k) => (k === a || k === b || k === c ? 1 : 2));
      COMBOS.push({ pos: [a + 1, b + 1, c + 1], order, sim: simulate(order) });
    }
const GOOD = COMBOS.filter((c) => c.sim.result === 7).length;

const BAD: Th[] = [1, 2, 1, 1, 2, 2];
const BAD_SIM = simulate(BAD);

const thColor = (t: Th) => (t === 1 ? C.blue : C.orange);

// ---------------------------------------------------------------------------
// 1. L'entrelacement fautif, créneau par créneau
// ---------------------------------------------------------------------------

const BAD_STEPS = [
  "compteur = 5 ; T1 et T2 vont chacun faire compteur++",
  "T1 lit 5 : regT1 ← compteur",
  "T2 lit 5 aussi, avant que T1 ait écrit",
  "T1 ajoute 1 : regT1 = 6 (la mémoire vaut toujours 5)",
  "T1 écrit 6 : compteur = 6",
  "T2 ajoute 1 à son 5 périmé : regT2 = 6",
  "T2 écrit 6 par-dessus : 6 au lieu de 7, l'incrément de T1 est perdu",
];

function ValBox({ x, label, value, color, hot }: { x: number; label: string; value: number | null; color: string; hot: boolean }) {
  return (
    <g>
      <rect x={x} y={130} width={160} height={78} fill={C.paper} stroke={color} strokeWidth={hot ? 2.5 : 1.2} />
      <text x={x + 10} y={150} fill={color} fontSize={13}>
        {label}
      </text>
      <motion.text
        key={String(value)}
        x={x + 80}
        y={192}
        textAnchor="middle"
        fill={C.ink}
        fontSize={26}
        fontWeight={600}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        {value === null ? "–" : value}
      </motion.text>
    </g>
  );
}

function BadInterleaving({ i }: { i: number }) {
  const st = i === 0 ? { mem: 5, r1: null, r2: null } : BAD_SIM.states[i - 1];
  const cur = i === 0 ? null : BAD_SIM.slots[i - 1];
  const regX = (t: Th) => (t === 1 ? 40 : 500);
  return (
    <svg viewBox="0 0 700 270" className="w-full max-w-[700px]" role="img" aria-label="Entrelacement de deux compteur++ qui perd un incrément">
      <ArrowMarkers />
      {BAD_SIM.slots.map((s, k) => {
        const past = k < i;
        return (
          <g key={k} opacity={past ? 1 : 0.35}>
            <rect x={16 + k * 112} y={14} width={100} height={52} fill={thColor(s.th)} fillOpacity={past ? 0.14 : 0.04} stroke={thColor(s.th)} strokeWidth={k === i - 1 ? 2.5 : 1} />
            <text x={66 + k * 112} y={35} textAnchor="middle" fill={thColor(s.th)} fontSize={13} fontWeight={600}>
              T{s.th}
            </text>
            <text x={66 + k * 112} y={55} textAnchor="middle" fill={C.ink} fontSize={13}>
              {ACT[s.act]}
            </text>
          </g>
        );
      })}
      <motion.g initial={false} animate={{ x: (Math.max(i, 1) - 1) * 112, opacity: i === 0 ? 0 : 1 }} transition={{ duration: 0.4 }}>
        <polygon points="58,84 66,74 74,84" fill={C.ink} />
      </motion.g>
      <text x={350} y={104} textAnchor="middle" fill={C.weak} fontSize={12}>
        créneaux, dans l'ordre choisi par l'ordonnanceur
      </text>

      <ValBox x={40} label="regT1" value={st.r1} color={C.blue} hot={cur?.th === 1} />
      <ValBox x={270} label="compteur (mémoire)" value={st.mem} color={C.text} hot={cur?.act === 2} />
      <ValBox x={500} label="regT2" value={st.r2} color={C.orange} hot={cur?.th === 2} />

      {cur && cur.act !== 1 && (
        <motion.line
          key={`a${i}`}
          x1={cur.act === 0 ? (cur.th === 1 ? 268 : 432) : cur.th === 1 ? 202 : 498}
          x2={cur.act === 0 ? (cur.th === 1 ? 204 : 496) : cur.th === 1 ? 266 : 434}
          y1={170}
          y2={170}
          stroke={thColor(cur.th)}
          strokeWidth={2}
          markerEnd={cur.th === 1 ? "url(#arr-blue)" : "url(#arr-orange)"}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
      {cur && cur.act === 1 && (
        <motion.text key={`p${i}`} x={regX(cur.th) + 150} y={126} textAnchor="end" fill={thColor(cur.th)} fontSize={14} fontWeight={600} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          +1
        </motion.text>
      )}
      {i === 6 && (
        <motion.text x={350} y={250} textAnchor="middle" fill={C.red} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          résultat 6, attendu 7 : un incrément perdu
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. Les 20 entrelacements
// ---------------------------------------------------------------------------

function ComboDetail({ k }: { k: number }) {
  const { sim } = COMBOS[k];
  const colX = (j: number) => 150 + j * 92;
  return (
    <svg key={k} viewBox="0 0 700 150" className="w-full max-w-[700px]" role="img" aria-label="Détail de l'entrelacement choisi">
      {[0, 1, 2, 3, 4, 5].map((j) => (
        <text key={j} x={colX(j)} y={16} textAnchor="middle" fill={C.faint} fontSize={12}>
          {j + 1}
        </text>
      ))}
      <text x={10} y={50} fill={C.blue} fontSize={13}>
        T1
      </text>
      <text x={10} y={88} fill={C.orange} fontSize={13}>
        T2
      </text>
      <text x={10} y={126} fill={C.text} fontSize={13}>
        compteur
      </text>
      <text x={10} y={16} fill={C.faint} fontSize={12}>
        créneau
      </text>
      {sim.slots.map((s, j) => {
        const st = sim.states[j];
        const reg = s.th === 1 ? st.r1 : st.r2;
        const label = s.act === 2 ? `écrire ${reg}` : `${ACT[s.act]} → ${reg}`;
        const prev = j === 0 ? 5 : sim.states[j - 1].mem;
        return (
          <motion.g key={j} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: j * 0.12 }}>
            <rect x={colX(j) - 43} y={s.th === 1 ? 30 : 68} width={86} height={28} fill={thColor(s.th)} fillOpacity={0.14} stroke={thColor(s.th)} />
            <text x={colX(j)} y={s.th === 1 ? 49 : 87} textAnchor="middle" fill={C.ink} fontSize={12}>
              {label}
            </text>
            <text x={colX(j)} y={126} textAnchor="middle" fill={st.mem !== prev ? C.ink : C.faint} fontSize={st.mem !== prev ? 14 : 12} fontWeight={st.mem !== prev ? 600 : 400}>
              {st.mem}
            </text>
          </motion.g>
        );
      })}
      <line x1={100} y1={104} x2={690} y2={104} stroke={C.line} />
    </svg>
  );
}

function Grid20() {
  const [sel, setSel] = useState(4);
  const res = COMBOS[sel].sim.result;
  return (
    <Figure caption={`Chaque case = un ordre des 6 créneaux (bleu T1, orange T2). ${GOOD} sur 20 donnent 7 : ceux où un thread finit avant que l'autre commence.`}>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {COMBOS.map((c, k) => (
            <button
              key={k}
              type="button"
              aria-pressed={sel === k}
              aria-label={`T1 aux créneaux ${c.pos.join(", ")}, résultat ${c.sim.result}`}
              onClick={() => setSel(k)}
              className={`row border px-2 py-2 ${sel === k ? "border-link bg-tint" : "border-line"}`}
            >
              <span className="flex justify-center gap-[2px]">
                {c.order.map((t, j) => (
                  <span key={j} style={{ width: 10, height: 10, background: thColor(t) }} />
                ))}
              </span>
              <span className="mt-1 block font-mono text-[12px]" style={{ color: c.sim.result === 7 ? C.green : C.red }}>
                → {c.sim.result}
              </span>
            </button>
          ))}
        </div>
        <p className="font-mono text-[13px] text-fg-weak">
          T1 aux créneaux {"{"}
          {COMBOS[sel].pos.join(", ")}
          {"}"} : compteur final ={" "}
          <span style={{ color: res === 7 ? C.green : C.red }}>{res}</span>
        </p>
        <ComboDetail k={sel} />
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Attente active naïve sur un booléen « occupé »
// ---------------------------------------------------------------------------

const ST = { test: 110, prise: 340, salle: 580 };

const BUSY_STEPS = [
  "occupé = faux ; T1 et T2 veulent entrer",
  "T1 teste : occupé vaut faux, il ne reboucle pas",
  "T2 teste aussi : occupé vaut toujours faux",
  "T1 écrit occupé = vrai et entre",
  "T2, qui a déjà testé, écrit vrai et entre aussi : deux dedans ✗",
];

function BusyWait({ i }: { i: number }) {
  const t1x = i >= 3 ? ST.salle - 30 : ST.test - 24;
  const t2x = i >= 4 ? ST.salle + 30 : ST.test + 24;
  const dedans = (i >= 3 ? 1 : 0) + (i >= 4 ? 1 : 0);
  const occupe = i >= 3;
  return (
    <svg viewBox="0 0 700 250" className="w-full max-w-[700px]" role="img" aria-label="Attente active sur un booléen : deux threads entrent">
      <ArrowMarkers />
      <rect x={20} y={36} width={180} height={50} fill={C.fill} stroke={C.lineStrong} />
      <text x={110} y={66} textAnchor="middle" fill={C.ink} fontSize={13}>
        test : occupé ?
      </text>
      <path d="M 70 36 C 70 6, 150 6, 150 34" fill="none" stroke={C.weak} markerEnd="url(#arr-weak)" />
      <text x={160} y={16} fill={C.weak} fontSize={12}>
        vrai : saut au test
      </text>
      <line x1={200} y1={61} x2={248} y2={61} stroke={C.weak} markerEnd="url(#arr-weak)" />
      <text x={224} y={54} textAnchor="middle" fill={C.weak} fontSize={12}>
        faux
      </text>
      <rect x={250} y={36} width={180} height={50} fill={C.fill} stroke={C.lineStrong} />
      <text x={340} y={66} textAnchor="middle" fill={C.ink} fontSize={13}>
        occupé ← vrai
      </text>
      <line x1={430} y1={61} x2={478} y2={61} stroke={C.weak} markerEnd="url(#arr-weak)" />
      <rect x={480} y={20} width={200} height={170} fill={dedans === 2 ? C.red : C.green} fillOpacity={0.07} stroke={dedans === 2 ? C.red : C.lineStrong} strokeWidth={dedans === 2 ? 2 : 1} />
      <text x={580} y={44} textAnchor="middle" fill={C.ink} fontSize={13}>
        section critique
      </text>
      <motion.text key={dedans} x={580} y={176} textAnchor="middle" fill={dedans === 2 ? C.red : C.text} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        dedans : {dedans}
      </motion.text>

      <rect x={20} y={168} width={180} height={44} fill={C.paper} stroke={occupe ? C.orange : C.lineStrong} />
      <text x={30} y={195} fill={C.weak} fontSize={12}>
        occupé =
      </text>
      <motion.text key={String(occupe)} x={110} y={195} fill={C.ink} fontSize={14} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {occupe ? "vrai" : "faux"}
      </motion.text>

      {[
        { t: 1 as Th, x: t1x, y: i >= 3 ? 110 : 116, hot: i === 1 || i === 3, keys: i === 3 ? [ST.test - 24, ST.prise, t1x] : undefined },
        { t: 2 as Th, x: t2x, y: i >= 4 ? 110 : 116, hot: i === 2 || i === 4, keys: i === 4 ? [ST.test + 24, ST.prise, t2x] : undefined },
      ].map((tk) => (
        <motion.g key={tk.t} initial={false} animate={{ x: tk.keys ?? tk.x, y: tk.y }} transition={{ duration: tk.keys ? 1 : 0.4 }}>
          <circle cx={0} cy={0} r={16} fill={C.paper} stroke={thColor(tk.t)} strokeWidth={tk.hot ? 3 : 2} />
          <text x={0} y={5} textAnchor="middle" fill={thColor(tk.t)} fontSize={13} fontWeight={600}>
            T{tk.t}
          </text>
        </motion.g>
      ))}
      {(i === 1 || i === 2) && (
        <motion.text key={`lit${i}`} x={i === 1 ? ST.test - 24 : ST.test + 24} y={150} textAnchor="middle" fill={C.weak} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          lit faux
        </motion.text>
      )}
      <text x={350} y={240} textAnchor="middle" fill={C.weak} fontSize={12}>
        le test et la prise sont deux étapes : l'autre thread passe entre les deux
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4. Peterson
// ---------------------------------------------------------------------------

const PET_STEPS = [
  "Départ : demande = [faux, faux], dernier = ?",
  "T1 lève son drapeau : demande[1] = vrai",
  "T2 lève le sien : demande[2] = vrai",
  "T1 écrit son numéro : dernier = 1",
  "T2 écrit le sien par-dessus : dernier = 2",
  "T1 teste : demande[2] && dernier == 1 → faux, il entre",
  "T2 teste : demande[1] && dernier == 2 → vrai, il attend",
  "T1 sort et baisse son drapeau : demande[1] = faux",
  "La condition de T2 devient fausse : T2 entre à son tour",
];

function Flag({ x, up, color, label }: { x: number; up: boolean; color: string; label: string }) {
  return (
    <g>
      <line x1={x} y1={30} x2={x} y2={146} stroke={C.lineStrong} strokeWidth={2} />
      <motion.rect x={x} width={44} height={26} fill={color} initial={false} animate={{ y: up ? 30 : 118, fillOpacity: up ? 0.9 : 0.25 }} transition={{ duration: 0.5 }} />
      <text x={x} y={166} textAnchor="middle" fill={C.text} fontSize={12}>
        {label}
      </text>
      <motion.text key={String(up)} x={x} y={184} textAnchor="middle" fill={up ? color : C.weak} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {up ? "vrai" : "faux"}
      </motion.text>
    </g>
  );
}

function Peterson({ i }: { i: number }) {
  const d1 = i >= 1 && i <= 6;
  const d2 = i >= 2;
  const dernier = i < 3 ? "?" : i === 3 ? "1" : "2";
  const t1 = i < 5 ? { x: 400, y: 76, o: 1 } : i < 7 ? { x: 560, y: 104, o: 1 } : { x: 600, y: 226, o: 0.45 };
  const t2 = i < 8 ? { x: 400, y: 136, o: 1 } : { x: 600, y: 104, o: 1 };
  const test1 = i >= 5 ? "T1 : demande[2] && dernier == 1 → vrai && faux → entre" : "";
  const test2 = i >= 8 ? "T2 : demande[1] && dernier == 2 → faux && vrai → entre" : i >= 6 ? "T2 : demande[1] && dernier == 2 → vrai && vrai → attend" : "";
  return (
    <svg viewBox="0 0 700 270" className="w-full max-w-[700px]" role="img" aria-label="Algorithme de Peterson pas à pas">
      <text x={20} y={18} fill={C.weak} fontSize={12}>
        variables partagées
      </text>
      <Flag x={50} up={d1} color={C.blue} label="demande[1]" />
      <Flag x={160} up={d2} color={C.orange} label="demande[2]" />
      <text x={290} y={52} textAnchor="middle" fill={C.text} fontSize={12}>
        dernier
      </text>
      <rect x={250} y={60} width={80} height={60} fill={C.paper} stroke={i === 3 || i === 4 ? C.ink : C.lineStrong} strokeWidth={i === 3 || i === 4 ? 2 : 1} />
      <motion.text key={dernier} x={290} y={100} textAnchor="middle" fill={dernier === "1" ? C.blue : dernier === "2" ? C.orange : C.weak} fontSize={24} fontWeight={600} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
        {dernier}
      </motion.text>

      <rect x={470} y={30} width={210} height={150} fill={C.green} fillOpacity={0.06} stroke={C.lineStrong} />
      <text x={575} y={52} textAnchor="middle" fill={C.ink} fontSize={13}>
        section critique
      </text>
      <line x1={470} y1={60} x2={470} y2={150} stroke={C.paper} strokeWidth={3} />

      {[
        { t: 1 as Th, p: t1, wait: false },
        { t: 2 as Th, p: t2, wait: i === 6 || i === 7 },
      ].map(({ t, p, wait }) => (
        <motion.g key={t} initial={false} animate={{ x: p.x, y: p.y, opacity: p.o }} transition={{ duration: 0.6 }}>
          {wait && <circle r={22} fill="none" stroke={C.red} strokeDasharray="4 3" />}
          <circle r={16} fill={C.paper} stroke={thColor(t)} strokeWidth={2.5} />
          <text y={5} textAnchor="middle" fill={thColor(t)} fontSize={13} fontWeight={600}>
            T{t}
          </text>
        </motion.g>
      ))}
      {(i === 6 || i === 7) && (
        <motion.text x={400} y={176} textAnchor="middle" fill={C.red} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          cède
        </motion.text>
      )}

      <text x={20} y={222} fill={C.blue} fontSize={12}>
        {test1}
      </text>
      <motion.text key={test2} x={20} y={246} fill={C.orange} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {test2}
      </motion.text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 5. Interblocage et famine
// ---------------------------------------------------------------------------

type Dl = "oppose" | "meme" | "famine";

const P = { T1: { x: 100, y: 135 }, T2: { x: 540, y: 135 }, A: { x: 320, y: 50 }, B: { x: 320, y: 220 } };

function arrowPts(from: { x: number; y: number }, to: { x: number; y: number }, r1: number, r2: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy);
  return { x1: from.x + (dx / L) * r1, y1: from.y + (dy / L) * r1, x2: to.x - (dx / L) * r2, y2: to.y - (dy / L) * r2 };
}

function Edge({ from, to, kind, delay }: { from: keyof typeof P; to: keyof typeof P; kind: "detient" | "attend"; delay: number }) {
  const a = arrowPts(P[from], P[to], from.startsWith("T") ? 32 : 40, to.startsWith("T") ? 34 : 42);
  const color = kind === "detient" ? C.text : C.red;
  return (
    <motion.line
      {...a}
      stroke={color}
      strokeWidth={2}
      strokeDasharray={kind === "attend" ? "6 4" : undefined}
      markerEnd={kind === "detient" ? "url(#arr-text)" : "url(#arr-red)"}
      initial={kind === "attend" ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
      animate={kind === "attend" ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    />
  );
}

function Deadlock({ mode }: { mode: Dl }) {
  if (mode === "famine") {
    return (
      <svg key={mode} viewBox="0 0 640 270" className="w-full max-w-[640px]" role="img" aria-label="Famine : T2 attend pendant que T1 passe et repasse">
        <rect x={300} y={50} width={220} height={150} fill={C.green} fillOpacity={0.06} stroke={C.lineStrong} />
        <text x={410} y={74} textAnchor="middle" fill={C.ink} fontSize={13}>
          section critique
        </text>
        <motion.g initial={{ x: 200, y: 110 }} animate={{ x: [200, 410, 200] }} transition={{ duration: 1.2, repeat: 4, ease: "easeInOut" }}>
          <circle r={16} fill={C.paper} stroke={C.blue} strokeWidth={2.5} />
          <text y={5} textAnchor="middle" fill={C.blue} fontSize={13} fontWeight={600}>
            T1
          </text>
        </motion.g>
        <g transform="translate(200 170)">
          <circle r={22} fill="none" stroke={C.red} strokeDasharray="4 3" />
          <circle r={16} fill={C.paper} stroke={C.orange} strokeWidth={2.5} />
          <text y={5} textAnchor="middle" fill={C.orange} fontSize={13} fontWeight={600}>
            T2
          </text>
        </g>
        <text x={20} y={40} fill={C.blue} fontSize={12}>
          passages de T1 :
        </text>
        {[0, 1, 2, 3, 4].map((k) => (
          <motion.rect key={k} x={150 + k * 18} y={30} width={12} height={12} fill={C.blue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + k * 1.2 }} />
        ))}
        <text x={20} y={240} fill={C.red} fontSize={12}>
          T2 attend toujours : famine (un thread bloqué, les autres avancent)
        </text>
      </svg>
    );
  }
  const oppose = mode === "oppose";
  return (
    <svg key={mode} viewBox="0 0 640 270" className="w-full max-w-[640px]" role="img" aria-label="Graphe d'attente entre deux threads et deux verrous">
      <ArrowMarkers />
      {(["T1", "T2"] as const).map((t) => (
        <g key={t}>
          <circle cx={P[t].x} cy={P[t].y} r={28} fill={C.paper} stroke={t === "T1" ? C.blue : C.orange} strokeWidth={2.5} />
          <text x={P[t].x} y={P[t].y + 5} textAnchor="middle" fill={t === "T1" ? C.blue : C.orange} fontSize={15} fontWeight={600}>
            {t}
          </text>
        </g>
      ))}
      {(["A", "B"] as const).map((v) => (
        <g key={v}>
          <rect x={P[v].x - 48} y={P[v].y - 22} width={96} height={44} fill={C.fill} stroke={C.lineStrong} />
          <text x={P[v].x} y={P[v].y + 5} textAnchor="middle" fill={C.ink} fontSize={14}>
            verrou {v}
          </text>
        </g>
      ))}
      {oppose ? (
        <>
          <Edge from="A" to="T1" kind="detient" delay={0} />
          <Edge from="B" to="T2" kind="detient" delay={0.3} />
          <Edge from="T1" to="B" kind="attend" delay={0.7} />
          <Edge from="T2" to="A" kind="attend" delay={1} />
          <motion.text x={320} y={140} textAnchor="middle" fill={C.red} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            cycle T1 → B → T2 → A → T1
          </motion.text>
        </>
      ) : (
        <>
          <Edge from="A" to="T1" kind="detient" delay={0} />
          <Edge from="T2" to="A" kind="attend" delay={0.4} />
          <Edge from="B" to="T1" kind="detient" delay={0.8} />
          <motion.text x={320} y={140} textAnchor="middle" fill={C.green} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            pas de cycle : T1 finit, rend A et B
          </motion.text>
        </>
      )}
      <text x={20} y={262} fill={C.weak} fontSize={12}>
        trait plein : détient · pointillé rouge : attend
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Concurrence() {
  const [dl, setDl] = useState<Dl>("oppose");
  return (
    <>
      <Section title="L'idée">
        <Idea>compteur++ n'est pas une seule action : lire, ajouter 1, écrire. Deux threads peuvent s'entrelacer entre ces étapes et perdre un incrément.</Idea>
        <p>
          Deux threads font chacun <strong>1 000 000</strong> fois <code>compteur++</code>. On attend 2 000 000. On obtient moins, et le résultat change à chaque exécution.
        </p>
        <p>Remède : une section critique, protégée par exclusion mutuelle (Peterson à la main, un mutex en pratique).</p>
      </Section>

      <Section title="Un entrelacement qui perd un incrément">
        <p>
          Un <strong>entrelacement</strong> est l'ordre dans lequel les étapes des deux threads s'exécutent. C'est l'ordonnanceur qui le choisit.
        </p>
        <Stepper steps={BAD_STEPS} interval={2200} caption="Exemple du cours : compteur = 5, chaque thread fait lire, +1, écrire.">
          {(i) => <BadInterleaving i={i} />}
        </Stepper>
        <p>
          Avec 3 étapes chacun, il y a <strong>C(6, 3) = 20</strong> entrelacements. Cliquer une case pour la simuler.
        </p>
        <Grid20 />
      </Section>

      <Section title="Section critique : sûreté et vivacité">
        <table className="ftable">
          <tbody>
            <tr>
              <th>Section critique</th>
              <td>le code qui touche une donnée partagée</td>
            </tr>
            <tr>
              <th>Exclusion mutuelle</th>
              <td>au plus un thread à la fois dans la section critique</td>
            </tr>
            <tr>
              <th>Sûreté</th>
              <td>rien de mauvais n'arrive : jamais deux threads dedans</td>
            </tr>
            <tr>
              <th>Vivacité</th>
              <td>ce qui doit arriver finit par arriver : qui demande finit par entrer</td>
            </tr>
            <tr>
              <th>Interblocage</th>
              <td>tous les threads attendent, indéfiniment</td>
            </tr>
            <tr>
              <th>Famine</th>
              <td>un thread attend sans fin, pendant que les autres avancent</td>
            </tr>
            <tr>
              <th>Attente active</th>
              <td>reboucler sur un test, en consommant du processeur</td>
            </tr>
          </tbody>
        </table>
        <p>Première idée : un booléen occupé. Tant qu'il est vrai, on reboucle. Mais une boucle, c'est un test puis un saut.</p>
        <Stepper steps={BUSY_STEPS} caption="Attente active naïve : la sûreté est violée.">
          {(i) => <BusyWait i={i} />}
        </Stepper>
      </Section>

      <Section title="Peterson : le dernier arrivé cède">
        <p>Deux drapeaux (je demande) et une case dernier. Pour entrer, chaque thread :</p>
        <ul className="flist">
          <li>lève son drapeau ;</li>
          <li>écrit son numéro dans dernier ;</li>
          <li>attend tant que l'autre demande ET que dernier == moi.</li>
        </ul>
        <Stepper steps={PET_STEPS} interval={2200} caption="dernier ne contient qu'un numéro : quand les deux demandent, exactement un des deux cède.">
          {(i) => <Peterson i={i} />}
        </Stepper>
      </Section>

      <Section title="Interblocage et famine">
        <Figure caption="Interblocage : chacun attend ce que l'autre détient (cycle). Si tous prennent A avant B, le cycle ne peut plus se former. Famine : un seul thread attend sans fin.">
          <div className="space-y-4">
            <Choice
              options={[
                { value: "oppose", label: "T1 : A puis B · T2 : B puis A" },
                { value: "meme", label: "les deux : A puis B" },
                { value: "famine", label: "famine" },
              ]}
              value={dl}
              onChange={setDl}
            />
            <Deadlock mode={dl} />
          </div>
        </Figure>
      </Section>

      <Section title="Le code à connaître">
        <p>Peterson, version du TP (threads numérotés 0 et 1, drapeaux atomic_bool) :</p>
        <Code
          mark={[5, 6, 8]}
          code={`static atomic_bool demande_et_occupation[2] = {};
static atomic_int dernier = 0;

void debutSectionCritique(int me) {
  demande_et_occupation[me] = true;          // je veux entrer
  dernier = me;                              // je suis arrivé en dernier
alpha:
  if (demande_et_occupation[1 - me] && dernier == me)   // l'autre demande ET je suis le dernier
    goto alpha;                                          // → j'attends
}
void finSectionCritique(int me) { demande_et_occupation[me] = false; }`}
        />
        <p>En pratique, un mutex (sans attente active : le thread qui attend dort) :</p>
        <Code
          code={`mtx_lock(&m);     // mtx_init(&m, mtx_plain) une fois dans main
compteur++;
mtx_unlock(&m);`}
        />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>compteur++ = lire, +1, écrire : trois actions, pas une.</li>
          <li>Deux compteur++ sur 5 : 20 entrelacements, 2 seulement donnent 7, les 18 autres donnent 6.</li>
          <li>L'ordre change à chaque exécution : un test peut passer par chance.</li>
          <li>Section critique : exclusion mutuelle, jugée sur la sûreté (jamais deux dedans) et la vivacité (pas d'interblocage ni de famine).</li>
          <li>Attente active sur un booléen : test et prise séparés, donc deux threads peuvent entrer.</li>
          <li>Peterson : drapeau + dernier, le dernier arrivé cède. Pour 2 threads.</li>
          <li>En vrai : un mutex. lock et unlock contiennent les barrières contre les réordonnancements.</li>
        </Points>
        <Trap>
          <p>
            Rendre <code>a</code> et <code>b</code> atomiques ne protège pas <code>a++; b++;</code> (TP3, version 0). Chaque incrément est indivisible, pas le groupe. Il faut une section critique autour du groupe.
          </p>
          <p>
            Le compilateur et le processeur réordonnent les instructions, ce qui peut casser Peterson. Au TP, avec de simples <code>bool</code>, les versions à drapeaux plantaient : il faut <code>atomic_bool</code>, ou un mutex.
          </p>
        </Trap>
        <Reveal question={<p>compteur = 5, deux threads font compteur++. Quelles valeurs finales ? Sur combien d'entrelacements ?</p>}>
          <p>
            <strong>6 ou 7.</strong> Il y a C(6, 3) = 20 entrelacements. Seuls 2 donnent 7 : ceux où un thread fait ses trois étapes avant que l'autre commence. Les 18 autres perdent un incrément.
          </p>
        </Reveal>
        <Reveal question={<p>Pourquoi une attente active sur un booléen occupé ne garantit-elle pas l'exclusion mutuelle ?</p>}>
          <p>
            Le test et la prise sont deux instructions. T1 et T2 peuvent tous deux lire <code>faux</code> avant que l'un écrive <code>vrai</code>. Ils entrent alors ensemble : la <strong>sûreté</strong> est violée.
          </p>
        </Reveal>
        <Reveal question={<p>Pourquoi Peterson ne peut-il pas s'interbloquer ?</p>}>
          <p>
            <code>dernier</code> ne contient qu'un numéro. Quand les deux demandent, seul celui dont le numéro est dans <code>dernier</code> attend : l'autre entre. En sortant, il baisse son drapeau, et celui qui attendait entre à son tour.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
