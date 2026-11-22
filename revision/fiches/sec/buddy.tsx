"use client";
// Fiche CM6 Allocation mémoire : l'allocateur buddy, exercice du cours
// (zone de 1024 octets, bloc minimal 128, A = malloc(200), B = malloc(100), C = malloc(256), free(B), free(A)).
import { useState } from "react";
import { ArrowMarkers, C, Choice, Figure, Formula, Idea, Points, Reveal, Section, Slider, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// Outils communs : la barre de 1024 octets
// ---------------------------------------------------------------------------

type Owner = "A" | "B" | "C" | null;
interface Blk {
  a: number; // adresse relative
  s: number; // taille
  o: Owner;
}

const X0 = 40;
const K = 0.625; // 640 px pour 1024 octets
const px = (addr: number) => X0 + addr * K;
const TICKS = [0, 128, 256, 384, 512, 768, 1024];

function ownerColor(o: Owner): string {
  return o === "A" ? C.blue : o === "B" ? C.orange : o === "C" ? C.green : C.weak;
}

function Ticks({ y }: { y: number }) {
  return (
    <g>
      {TICKS.map((t) => (
        <g key={t}>
          <line x1={px(t)} y1={y} x2={px(t)} y2={y + 6} stroke={C.lineStrong} />
          <text x={px(t)} y={y + 20} textAnchor="middle" fill={C.weak} fontSize={12}>
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

function Block({ b, y, h, pending, lost }: { b: Blk; y: number; h: number; pending?: boolean; lost?: number }) {
  const col = ownerColor(b.o);
  const w = b.s * K;
  return (
    <motion.g initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.45 }}>
      <rect
        x={px(b.a)}
        y={y}
        width={w}
        height={h}
        fill={b.o ? col : C.fill2}
        fillOpacity={b.o ? 0.22 : 1}
        stroke={pending ? C.ink : b.o ? col : C.lineStrong}
        strokeWidth={pending ? 2 : 1.5}
        strokeDasharray={pending ? "6 4" : undefined}
      />
      {lost !== undefined && (
        <motion.rect
          x={px(b.a + b.s - lost)}
          y={y + 2}
          width={lost * K - 2}
          height={h - 4}
          fill={C.red}
          fillOpacity={0.35}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />
      )}
      <text x={pending ? px(b.a) + 8 : px(b.a) + w / 2} y={y + h / 2 + 5} textAnchor={pending ? "start" : "middle"} fill={C.ink} fontSize={pending ? 12 : b.s >= 256 ? 13 : 12}>
        {b.o ? `${b.o} · ${b.s}` : `libre ${b.s}`}
      </text>
    </motion.g>
  );
}

// ---------------------------------------------------------------------------
// 1. Arrondi à la puissance de 2
// ---------------------------------------------------------------------------

function tailleBloc(n: number): number {
  let b = 128;
  while (b < n) b *= 2;
  return b;
}

const LEVELS = [128, 256, 512, 1024];
const LEVEL_Y: Record<number, number> = { 128: 196, 256: 150, 512: 104, 1024: 58 };
const CX = (n: number) => 70 + n * (540 / 1024);

function Arrondi({ n }: { n: number }) {
  const b = tailleBloc(n);
  const lost = b - n;
  const stairs = [
    [0, 128, 128],
    [128, 256, 256],
    [256, 512, 512],
    [512, 1024, 1024],
  ];
  const d = stairs.map(([a, e, l], k) => `${k === 0 ? "M" : "L"}${CX(a)},${LEVEL_Y[l]} L${CX(e)},${LEVEL_Y[l]}`).join(" ");
  const usedW = (n / b) * 540;
  return (
    <svg viewBox="0 0 640 310" className="w-full max-w-[640px]" role="img" aria-label="Taille du bloc buddy en fonction de la demande">
      {/* axes */}
      <line x1={70} y1={220} x2={620} y2={220} stroke={C.lineStrong} />
      <line x1={70} y1={220} x2={70} y2={40} stroke={C.lineStrong} />
      {LEVELS.map((l) => (
        <g key={l}>
          <line x1={66} y1={LEVEL_Y[l]} x2={620} y2={LEVEL_Y[l]} stroke={C.line} strokeDasharray="2 4" />
          <text x={60} y={LEVEL_Y[l] + 4} textAnchor="end" fill={C.weak} fontSize={12}>
            {l}
          </text>
        </g>
      ))}
      {[0, 256, 512, 768, 1024].map((t) => (
        <text key={t} x={CX(t)} y={236} textAnchor="middle" fill={C.weak} fontSize={12}>
          {t}
        </text>
      ))}
      <text x={620} y={252} textAnchor="end" fill={C.faint} fontSize={12}>
        demande n
      </text>
      <text x={14} y={30} fill={C.faint} fontSize={12}>
        taille du bloc
      </text>
      <path d={d} fill="none" stroke={C.blue} strokeWidth={2} />
      {[100, 200, 256, 300, 1000].map((v) => (
        <circle key={v} cx={CX(v)} cy={LEVEL_Y[tailleBloc(v)]} r={3.5} fill={C.blue} />
      ))}
      <motion.line initial={false} animate={{ x1: CX(n), x2: CX(n) }} y1={220} y2={LEVEL_Y[b]} stroke={C.orange} strokeDasharray="4 3" />
      <motion.circle initial={false} animate={{ cx: CX(n), cy: LEVEL_Y[b] }} r={7} fill={C.orange} />

      {/* le bloc obtenu */}
      <text x={70} y={274} fill={C.text} fontSize={13}>
        bloc de {b} : {n} utilisés, {lost} perdus
      </text>
      <rect x={70} y={282} width={540} height={20} fill={C.red} fillOpacity={0.25} stroke={C.lineStrong} />
      <motion.rect x={70} y={282} height={20} fill={C.blue} fillOpacity={0.55} initial={false} animate={{ width: usedW }} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. L'exercice pas à pas
// ---------------------------------------------------------------------------

interface BStep {
  label: string;
  op: number; // opération en cours (-1 : aucune)
  blocks: Blk[];
  tzl: [number[], number[], number[]]; // TZL[7], TZL[8], TZL[9]
  lines: { t: string; c?: string }[];
  pending?: number; // adresse du bloc en cours (coupé ou fusionné)
  focus?: [number, number]; // bloc libéré, puis compagnon examiné
  lost?: boolean;
}

const OPS = ["A = malloc(200)", "B = malloc(100)", "C = malloc(256)", "free(B)", "free(A)"];
const OP_X = OPS.map((_, k) => 40 + OPS.slice(0, k).reduce((acc, o) => acc + o.length * 7.8 + 22, 0));

const A0: Blk = { a: 0, s: 256, o: "A" };
const B0: Blk = { a: 256, s: 128, o: "B" };
const C0: Blk = { a: 512, s: 256, o: "C" };
const L = (a: number, s: number): Blk => ({ a, s, o: null });

const EX: BStep[] = [
  {
    label: "État initial : un seul bloc libre de 1024",
    op: -1,
    blocks: [L(0, 1024)],
    tzl: [[], [], []],
    lines: [{ t: "Zone : 1024 octets, adresse 0" }, { t: "Bloc minimal : 128 = 2^7" }, { t: "Tailles marquage compris" }],
  },
  {
    label: "malloc(200) → 256 = 2^8 ; rien en TZL[8] ni TZL[9] : on coupe 1024",
    op: 0,
    blocks: [L(0, 512), L(512, 512)],
    tzl: [[], [], [512]],
    pending: 0,
    lines: [{ t: "200 → 256 = 2^8" }, { t: "TZL[8] vide, TZL[9] vide" }, { t: "(0, 1024) → (0, 512) + (512, 512)", c: C.blue }],
  },
  {
    label: "(0, 512) encore trop grand : on recoupe ; A prend (0, 256)",
    op: 0,
    blocks: [A0, L(256, 256), L(512, 512)],
    tzl: [[], [256], [512]],
    lines: [{ t: "(0, 512) → (0, 256) + (256, 256)" }, { t: "A prend le bloc en 0", c: C.blue }],
  },
  {
    label: "malloc(100) → 128 = 2^7 ; TZL[7] vide : on coupe (256, 256)",
    op: 1,
    blocks: [A0, L(256, 128), L(384, 128), L(512, 512)],
    tzl: [[384], [], [512]],
    pending: 256,
    lines: [{ t: "100 → 128 = 2^7" }, { t: "TZL[7] vide → TZL[8] : (256, 256)" }, { t: "(256, 256) → (256, 128) + (384, 128)", c: C.orange }],
  },
  {
    label: "B prend (256, 128) : 28 octets perdus (fragmentation interne)",
    op: 1,
    blocks: [A0, B0, L(384, 128), L(512, 512)],
    tzl: [[384], [], [512]],
    lost: true,
    lines: [{ t: "B prend le bloc en 256", c: C.orange }, { t: "B utilise 100 octets sur 128" }, { t: "128 − 100 = 28 perdus", c: C.red }],
  },
  {
    label: "malloc(256) = 2^8 ; TZL[8] vide : on coupe (512, 512) ; C prend (512, 256)",
    op: 2,
    blocks: [A0, B0, L(384, 128), C0, L(768, 256)],
    tzl: [[384], [768], []],
    lines: [{ t: "256 = 2^8 : pas d'arrondi" }, { t: "TZL[8] vide → TZL[9] : (512, 512)" }, { t: "→ (512, 256) + (768, 256) ; C en 512", c: C.green }],
  },
  {
    label: "free(B) : compagnon = 256 XOR 128 = 384, libre et de taille 128 → fusion",
    op: 3,
    blocks: [A0, L(256, 256), C0, L(768, 256)],
    tzl: [[], [768], []],
    pending: 256,
    focus: [384, 128],
    lines: [
      { t: "  256 = 100000000" },
      { t: "  128 = 010000000" },
      { t: "  XOR = 110000000 = 384", c: C.purple },
      { t: "libre, même taille → fusion (256, 256)", c: C.green },
    ],
  },
  {
    label: "Un cran au-dessus : 256 XOR 256 = 0 → c'est A, occupé → arrêt",
    op: 3,
    blocks: [A0, L(256, 256), C0, L(768, 256)],
    tzl: [[], [768, 256], []],
    focus: [0, 256],
    lines: [
      { t: "  256 = 100000000" },
      { t: "  256 = 100000000" },
      { t: "  XOR = 000000000 = 0", c: C.purple },
      { t: "(0, 256) = A, occupé → arrêt", c: C.red },
    ],
  },
  {
    label: "free(A) : 0 XOR 256 = 256, libre et de taille 256 → fusion en (0, 512)",
    op: 4,
    blocks: [L(0, 512), C0, L(768, 256)],
    tzl: [[], [768], []],
    pending: 0,
    focus: [256, 256],
    lines: [
      { t: "    0 = 000000000" },
      { t: "  256 = 100000000" },
      { t: "  XOR = 100000000 = 256", c: C.purple },
      { t: "libre, même taille → fusion (0, 512)", c: C.green },
    ],
  },
  {
    label: "0 XOR 512 = 512 : C occupe une moitié → arrêt ; (0, 512) va dans TZL[9]",
    op: 4,
    blocks: [L(0, 512), C0, L(768, 256)],
    tzl: [[], [768], [0]],
    focus: [512, 512],
    lines: [{ t: "0 XOR 512 = 512", c: C.purple }, { t: "(512, 512) pas libre en entier :" }, { t: "C occupe (512, 256) → arrêt", c: C.red }],
  },
];

function Exercice({ i }: { i: number }) {
  const st = EX[i];
  const by = 62;
  const bh = 48;
  return (
    <svg viewBox="0 0 720 330" className="w-full max-w-[720px]" role="img" aria-label="Exercice buddy pas à pas">
      <ArrowMarkers />
      {/* la suite d'opérations */}
      {OPS.map((o, k) => {
        return (
          <text key={o} x={OP_X[k]} y={22} fill={k === st.op ? C.ink : k < st.op ? C.weak : C.faint} fontSize={13} fontWeight={k === st.op ? 600 : 400}>
            {o}
          </text>
        );
      })}
      {/* la barre */}
      {st.blocks.map((b) => (
        <Block key={`${b.a}-${b.s}-${b.o ?? "l"}`} b={b} y={by} h={bh} pending={st.pending === b.a && b.o === null && i !== 0} lost={st.lost && b.o === "B" ? 28 : undefined} />
      ))}
      {st.focus && (
        <motion.rect
          key={`f${i}`}
          x={px(st.focus[0]) - 3}
          y={by - 4}
          width={st.focus[1] * K + 6}
          height={bh + 8}
          fill="none"
          stroke={C.purple}
          strokeWidth={2.5}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.4, 1] }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />
      )}
      <Ticks y={by + bh + 2} />

      {/* calcul */}
      <rect x={40} y={152} width={360} height={110} fill={C.fill} stroke={C.line} />
      {st.lines.map((l, k) => (
        <motion.text
          key={`${i}-${k}`}
          x={54}
          y={176 + k * 24}
          fill={l.c ?? C.text}
          fontSize={13}
          style={{ whiteSpace: "pre" }}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + k * 0.3 }}
        >
          {l.t}
        </motion.text>
      ))}

      {/* listes de blocs libres */}
      {st.tzl.map((list, k) => {
        const prev = i > 0 ? EX[i - 1].tzl[k].join(",") : "";
        const changed = prev !== list.join(",");
        return (
          <g key={k}>
            <rect x={424} y={152 + k * 38} width={256} height={32} fill={changed ? C.blue : C.fill} fillOpacity={changed ? 0.12 : 1} stroke={changed ? C.blue : C.line} />
            <text x={436} y={173 + k * 38} fill={C.weak} fontSize={13}>
              TZL[{k + 7}] ({2 ** (k + 7)})
            </text>
            <motion.text key={list.join(",") + i} x={668} y={173 + k * 38} textAnchor="end" fill={C.ink} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {"{ "}
              {list.join(", ")}
              {" }"}
            </motion.text>
          </g>
        );
      })}
      <text x={424} y={286} fill={C.faint} fontSize={12}>
        listes de blocs libres, par taille 2^i
      </text>
      {i === EX.length - 1 && (
        <motion.text x={40} y={300} fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          Réponse : A en 0, B en 256, C en 512.
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Le compagnon : adresse XOR taille
// ---------------------------------------------------------------------------

const bin10 = (v: number) => v.toString(2).padStart(10, "0");

function Compagnon({ a, s }: { a: number; s: number }) {
  const b = a ^ s;
  const parent = Math.min(a, b);
  const rows = [
    { l: "adresse", v: a, c: C.blue },
    { l: "taille", v: s, c: C.text },
    { l: "XOR", v: b, c: C.purple },
  ];
  return (
    <svg viewBox="0 0 720 230" className="w-full max-w-[720px]" role="img" aria-label="Calcul du compagnon par XOR">
      <ArrowMarkers />
      <rect x={px(0)} y={20} width={1024 * K} height={44} fill={C.fill} stroke={C.lineStrong} />
      {Array.from({ length: 1024 / s }, (_, k) => (
        <line key={k} x1={px(k * s)} y1={20} x2={px(k * s)} y2={64} stroke={C.line} />
      ))}
      <motion.rect initial={false} animate={{ x: px(parent) - 3, width: 2 * s * K + 6 }} y={14} height={56} fill="none" stroke={C.green} strokeDasharray="5 4" strokeWidth={1.5} />
      <motion.rect initial={false} animate={{ x: px(a), width: s * K }} y={20} height={44} fill={C.blue} fillOpacity={0.3} stroke={C.blue} strokeWidth={2} />
      <motion.rect initial={false} animate={{ x: px(b), width: s * K }} y={20} height={44} fill={C.purple} fillOpacity={0.25} stroke={C.purple} strokeWidth={2} />
      <motion.text initial={false} animate={{ x: px(a) + (s * K) / 2 }} y={47} textAnchor="middle" fill={C.ink} fontSize={13}>
        bloc
      </motion.text>
      <motion.text initial={false} animate={{ x: px(b) + (s * K) / 2 }} y={47} textAnchor="middle" fill={C.ink} fontSize={13}>
        compagnon
      </motion.text>
      <Ticks y={66} />
      {rows.map((r, k) => (
        <g key={r.l}>
          <text x={60} y={130 + k * 26} fill={C.weak} fontSize={13}>
            {r.l}
          </text>
          {bin10(r.v)
            .split("")
            .map((bit, j) => (
              <motion.text
                key={`${r.l}-${j}-${bit}`}
                x={170 + j * 16}
                y={130 + k * 26}
                textAnchor="middle"
                fill={k === 2 && bin10(a)[j] !== bin10(s)[j] ? C.purple : r.c}
                fontSize={14}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {bit}
              </motion.text>
            ))}
          <text x={340} y={130 + k * 26} fill={r.c} fontSize={14}>
            = {r.v}
          </text>
        </g>
      ))}
      <line x1={160} y1={164} x2={330} y2={164} stroke={C.lineStrong} />
      <text x={420} y={130} fill={C.text} fontSize={13}>
        compagnon de ({a}, {s}) :
      </text>
      <text x={420} y={154} fill={C.purple} fontSize={14}>
        ({b}, {s})
      </text>
      <text x={420} y={184} fill={C.green} fontSize={13}>
        fusion → ({parent}, {2 * s})
      </text>
      <text x={420} y={206} fill={C.faint} fontSize={12}>
        {parent} est un multiple de {2 * s}
      </text>
    </svg>
  );
}

function Voisin({ bad }: { bad: boolean }) {
  const blocks: Blk[] = [A0, L(256, 256), L(512, 256), L(768, 256)];
  return (
    <svg viewBox="0 0 720 200" className="w-full max-w-[720px]" role="img" aria-label="Voisin n'est pas compagnon">
      <ArrowMarkers />
      {blocks.map((b) => (
        <Block key={`${b.a}`} b={b} y={60} h={44} />
      ))}
      {/* grille des blocs de 512 alignés */}
      {[0, 512, 1024].map((t) => (
        <line key={t} x1={px(t)} y1={48} x2={px(t)} y2={116} stroke={C.ink} strokeWidth={2} />
      ))}
      <text x={px(0)} y={22} fill={C.weak} fontSize={12}>
        traits épais : frontières des blocs de 512 (0, 512, 1024)
      </text>
      <Ticks y={106} />
      {bad ? (
        <motion.g key="bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <rect x={px(256) - 2} y={56} width={512 * K + 4} height={52} fill="none" stroke={C.red} strokeWidth={2.5} strokeDasharray="7 4" />
          <text x={px(512)} y={164} textAnchor="middle" fill={C.red} fontSize={13}>
            ✗ bloc de 512 en 256 : chevauche la frontière 512 (256 mod 512 = 256 ≠ 0)
          </text>
        </motion.g>
      ) : (
        <motion.g key="good" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.path d={`M${px(384)},58 C${px(384)},28 ${px(128)},28 ${px(128)},58`} fill="none" stroke={C.purple} strokeWidth={2} markerEnd="url(#arr-purple)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
          <motion.path d={`M${px(640)},58 C${px(640)},28 ${px(896)},28 ${px(896)},58`} fill="none" stroke={C.purple} strokeWidth={2} markerEnd="url(#arr-purple)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
          <text x={px(512)} y={160} textAnchor="middle" fill={C.purple} fontSize={13}>
            256 XOR 256 = 0 : compagnon de (256, 256) = (0, 256), c'est A
          </text>
          <text x={px(512)} y={184} textAnchor="middle" fill={C.purple} fontSize={13}>
            512 XOR 256 = 768 : compagnon de (512, 256) = (768, 256)
          </text>
        </motion.g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Buddy() {
  const [n, setN] = useState(200);
  const [size, setSize] = useState(128);
  const [addr, setAddr] = useState(256);
  const [bad, setBad] = useState<"bad" | "good">("bad");
  const a = Math.floor(Math.min(addr, 1023) / size) * size; // adresse alignée sur la taille choisie
  const addrs = Array.from({ length: 1024 / size }, (_, k) => k * size);
  return (
    <>
      <Section title="L'idée">
        <Idea>Le buddy n'alloue que des blocs de 2^i octets. Pour allouer, il coupe un bloc en deux compagnons. Pour libérer, il fusionne avec le compagnon, trouvé par adresse XOR taille.</Idea>
        <p>Une liste de blocs libres par taille : TZL[i] contient les blocs libres de 2^i octets.</p>
        <p>
          À la libération, on fusionne si le compagnon est <strong>libre et de même taille</strong>, puis on recommence un cran au-dessus.
        </p>
      </Section>

      <Section title="Fragmentation et arrondi">
        <table className="ftable">
          <tbody>
            <tr>
              <th>Fragmentation externe</th>
              <td>les trous libres sont trop petits pour servir une demande (ex. trois trous de 128, une demande de 300)</td>
            </tr>
            <tr>
              <th>Fragmentation interne</th>
              <td>de la place allouée que le programme n'utilise pas</td>
            </tr>
          </tbody>
        </table>
        <Figure caption="taille_bloc(n) = max(128, plus petite puissance de 2 ≥ n). En rouge : ce qui est perdu dans le bloc (fragmentation interne).">
          <div className="space-y-4">
            <Choice label="Valeurs du cours" options={[100, 200, 256, 300, 1000]} value={n} onChange={setN} />
            <Slider label="demande n (octets)" value={n} min={1} max={1024} onChange={setN} format={(v) => `${v} → ${tailleBloc(v)}`} />
            <Arrondi n={n} />
          </div>
        </Figure>
      </Section>

      <Section title="L'exercice du cours pas à pas">
        <p>Zone de 1024 octets à l'adresse 0. Bloc minimal 128. Où va chaque bloc ? Que contiennent les listes à la fin ?</p>
        <Stepper steps={EX.map((e) => e.label)} interval={3000} caption="A bleu, B orange, C vert, libre gris. Pointillés : bloc en cours de découpe ou de fusion. Cadre violet : le compagnon examiné.">
          {(i) => <Exercice i={i} />}
        </Stepper>
      </Section>

      <Section title="Le compagnon : adresse XOR taille">
        <p>Le compagnon diffère du bloc par un seul bit : celui de la taille. Le XOR inverse ce bit.</p>
        <Figure caption="Choisir une taille et un bloc aligné : le XOR donne le compagnon (violet). Leur fusion (vert) commence sur un multiple du double de la taille.">
          <div className="space-y-4">
            <Choice label="Taille" options={[128, 256, 512]} value={size} onChange={setSize} />
            <Choice label="Adresse" options={addrs} value={a} onChange={setAddr} />
            <Compagnon a={a} s={size} />
          </div>
        </Figure>
        <Trap title="Piège : un voisin n'est pas forcément un compagnon">
          <p>Supposons C libéré : (256, 256) et (512, 256) sont libres, côte à côte. Les fusionner est faux.</p>
          <Figure>
            <div className="space-y-4">
              <Choice
                options={[
                  { value: "bad", label: "fusion avec le voisin" },
                  { value: "good", label: "la règle du XOR" },
                ]}
                value={bad}
                onChange={setBad}
              />
              <Voisin bad={bad === "bad"} />
            </div>
          </Figure>
        </Trap>
      </Section>

      <Section title="Méthode">
        <Formula>taille = max(bloc min, 2^⌈log₂ n⌉)</Formula>
        <Formula>compagnon = adresse XOR taille</Formula>
        <ul className="flist">
          <li>malloc : arrondir, chercher dans TZL[i], sinon couper le premier bloc libre plus grand, moitié par moitié.</li>
          <li>free : calculer adresse XOR taille ; fusionner si ce bloc est libre et de même taille ; remonter d'un cran.</li>
          <li>Tenir à jour la barre et les listes TZL après chaque opération.</li>
        </ul>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Tailles en 2^i seulement ; demande arrondie à la puissance de 2 au-dessus (au moins le bloc minimal).</li>
          <li>Une liste de blocs libres par taille : TZL[i].</li>
          <li>Rien à la bonne taille : on coupe un bloc plus grand en deux compagnons.</li>
          <li>Compagnon = adresse XOR taille ; fusion s'il est libre et de même taille, puis un cran au-dessus.</li>
          <li>Arrondir crée de la fragmentation interne (B : 28 octets perdus sur 128).</li>
        </Points>
        <Reveal question={<p>Zone de 1024, bloc min 128 : A = malloc(200), B = malloc(100), C = malloc(256), free(B), free(A). Placements et listes finales ?</p>}>
          <p>
            <strong>A en 0, B en 256, C en 512.</strong>
          </p>
          <p>À la fin : TZL[7] = {"{}"}, TZL[8] = {"{768}"}, TZL[9] = {"{0}"}.</p>
        </Reveal>
        <Reveal question={<p>Quel est le compagnon du bloc (384, 128) ? Et celui de (512, 256) ?</p>}>
          <p>384 XOR 128 = 110000000 XOR 010000000 = 100000000 = <strong>256</strong> : le bloc (256, 128).</p>
          <p>512 XOR 256 = <strong>768</strong> : le bloc (768, 256).</p>
        </Reveal>
        <Reveal question={<p>Pourquoi free(B) s'arrête-t-il après une seule fusion ?</p>}>
          <p>Après la fusion, le bloc fait (256, 256). Son compagnon est 256 XOR 256 = 0, c'est-à-dire A, encore occupé. On s'arrête et (256, 256) entre dans TZL[8].</p>
        </Reveal>
      </Section>
    </>
  );
}
