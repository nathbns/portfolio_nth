"use client";
// Fiche CM5 Sémaphores : P et V, valeur initiale, tampon borné (vides, pleines, mutex), ordre des P, channel.
import { useState } from "react";
import { ArrowMarkers, C, Choice, Code, Figure, Idea, Points, Reveal, Section, Slider, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// 1. La boîte à jetons (s = 2, trois threads)
// ---------------------------------------------------------------------------

const TOKEN_STEPS = [
  "s = 2 : deux jetons dans la boîte, file vide",
  "T1 fait P : il prend un jeton, s = 1",
  "T2 fait P : s = 0, la boîte est vide",
  "T3 fait P alors que s = 0 : il s'endort dans la file",
  "T1 fait V : il rend son jeton (s = 1) et T3 est réveillé",
  "T3 reprend aussitôt ce jeton : s = 0, personne ne dort",
];

const TH = { T1: { x: 140, y: 56 }, T2: { x: 300, y: 56 }, T3: { x: 460, y: 56 } };

function TokenBox({ i }: { i: number }) {
  const held = (t: keyof typeof TH) => ({ x: TH[t].x + 28, y: TH[t].y });
  const slotA = { x: 270, y: 194 };
  const slotB = { x: 330, y: 194 };
  const a = i === 0 || i === 4 ? slotA : i <= 3 ? held("T1") : held("T3");
  const b = i <= 1 ? slotB : held("T2");
  const t3 = i === 3 || i === 4 ? { x: 555, y: 194 } : TH.T3;
  const s = [2, 1, 0, 0, 1, 0][i];
  const op: Record<number, { t: keyof typeof TH; text: string; color: string }> = {
    1: { t: "T1", text: "P", color: C.ink },
    2: { t: "T2", text: "P", color: C.ink },
    3: { t: "T3", text: "P : bloque", color: C.red },
    4: { t: "T1", text: "V", color: C.green },
  };
  const cur = op[i];
  return (
    <svg viewBox="0 0 660 240" className="w-full max-w-[660px]" role="img" aria-label="Sémaphore : boîte à jetons et file d'attente">
      <rect x={190} y={140} width={220} height={80} fill={C.paper} stroke={C.lineStrong} />
      <motion.text key={`s${s}`} x={202} y={160} fill={C.ink} fontSize={14} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        s = {s}
      </motion.text>
      <rect x={470} y={140} width={170} height={80} fill={C.fill} stroke={C.lineStrong} strokeDasharray="5 4" />
      <text x={482} y={160} fill={C.weak} fontSize={12}>
        file d'attente
      </text>
      {(["T1", "T2"] as const).map((t) => (
        <g key={t} transform={`translate(${TH[t].x} ${TH[t].y})`}>
          <circle r={17} fill={C.paper} stroke={C.blue} strokeWidth={2} />
          <text y={5} textAnchor="middle" fill={C.ink} fontSize={13}>
            {t}
          </text>
        </g>
      ))}
      <motion.g initial={false} animate={{ x: t3.x, y: t3.y }} transition={{ duration: 0.7 }}>
        {i === 4 && <circle r={23} fill="none" stroke={C.yellow} strokeWidth={2.5} />}
        <circle r={17} fill={C.paper} stroke={C.blue} strokeWidth={2} />
        <text y={5} textAnchor="middle" fill={C.ink} fontSize={13}>
          T3
        </text>
      </motion.g>
      {[a, b].map((p, k) => (
        <motion.circle key={k} r={9} fill={C.yellow} stroke={C.ink} strokeWidth={0.8} initial={false} animate={{ cx: p.x, cy: p.y }} transition={{ duration: 0.7, ease: "easeInOut" }} />
      ))}
      {cur && (
        <motion.text key={`op${i}`} x={TH[cur.t].x} y={20} textAnchor="middle" fill={cur.color} fontSize={13} fontWeight={600} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {cur.text}
        </motion.text>
      )}
      <text x={20} y={194} fill={C.weak} fontSize={12}>
        jeton :
      </text>
      <circle cx={88} cy={190} r={9} fill={C.yellow} stroke={C.ink} strokeWidth={0.8} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. La valeur initiale décide de l'usage
// ---------------------------------------------------------------------------

function InitValue({ k }: { k: number }) {
  const inside = Math.min(k, 5);
  const msg =
    k === 0
      ? "0 jeton : P bloque toujours. Le thread attend qu'un autre fasse V (un événement)."
      : k === 1
        ? "1 jeton : un seul thread dedans. C'est l'exclusion mutuelle."
        : `${k} jetons : au plus ${k} threads dedans, comme ${k} places de parking.`;
  return (
    <svg viewBox="0 0 660 210" className="w-full max-w-[660px]" role="img" aria-label="Effet de la valeur initiale d'un sémaphore">
      <rect x={390} y={50} width={250} height={130} fill={C.green} fillOpacity={0.06} stroke={C.lineStrong} />
      <text x={402} y={70} fill={C.ink} fontSize={13}>
        section
      </text>
      <text x={20} y={30} fill={C.weak} fontSize={12}>
        sem_init(&amp;s, 0, {k}) puis chacun fait P
      </text>
      {[0, 1, 2, 3, 4].map((j) => {
        const isIn = j < inside;
        const q = j - inside;
        const x = isIn ? 430 + j * 60 : 340 - q * 56;
        return (
          <motion.g key={j} initial={false} animate={{ x, y: 120 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
            <circle r={17} fill={C.paper} stroke={isIn ? C.green : C.weak} strokeWidth={2} />
            <text y={5} textAnchor="middle" fill={C.ink} fontSize={13}>
              T{j + 1}
            </text>
            <motion.circle cx={14} cy={-14} r={6} fill={C.yellow} initial={false} animate={{ opacity: isIn ? 1 : 0 }} />
          </motion.g>
        );
      })}
      <motion.text key={msg} x={20} y={200} fill={k === 0 ? C.orange : C.text} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {msg}
      </motion.text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Le tampon borné, N = 3, messages a b c d
// ---------------------------------------------------------------------------

interface Buf {
  cells: [string, boolean][]; // contenu, case occupée
  iecr: number;
  ilect: number;
  vides: number;
  pleines: number;
  prod: string;
  cons: string;
  lus: string;
  hot?: "prod" | "cons";
  prodSleep?: boolean;
  consSleep?: boolean;
}

const E: [string, boolean] = ["", false];
const BUF: Buf[] = [
  { cells: [E, E, E], iecr: 0, ilect: 0, vides: 3, pleines: 0, prod: "prêt", cons: "lent", lus: "" },
  { cells: [["a", true], E, E], iecr: 1, ilect: 0, vides: 2, pleines: 1, prod: "dépose a", cons: "", lus: "", hot: "prod" },
  { cells: [["a", true], ["b", true], E], iecr: 2, ilect: 0, vides: 1, pleines: 2, prod: "dépose b", cons: "", lus: "", hot: "prod" },
  { cells: [["a", true], ["b", true], ["c", true]], iecr: 0, ilect: 0, vides: 0, pleines: 3, prod: "dépose c", cons: "", lus: "", hot: "prod" },
  { cells: [["a", true], ["b", true], ["c", true]], iecr: 0, ilect: 0, vides: 0, pleines: 3, prod: "dort (d en main)", cons: "", lus: "", hot: "prod", prodSleep: true },
  { cells: [["a", false], ["b", true], ["c", true]], iecr: 0, ilect: 1, vides: 0, pleines: 2, prod: "réveillé, prend le jeton", cons: "retire a", lus: "a", hot: "cons" },
  { cells: [["d", true], ["b", true], ["c", true]], iecr: 1, ilect: 1, vides: 0, pleines: 3, prod: "dépose d", cons: "", lus: "a", hot: "prod" },
  { cells: [["d", true], ["b", false], ["c", true]], iecr: 1, ilect: 2, vides: 1, pleines: 2, prod: "", cons: "retire b", lus: "a b", hot: "cons" },
  { cells: [["d", true], ["b", false], ["c", false]], iecr: 1, ilect: 0, vides: 2, pleines: 1, prod: "", cons: "retire c", lus: "a b c", hot: "cons" },
  { cells: [["d", false], ["b", false], ["c", false]], iecr: 1, ilect: 1, vides: 3, pleines: 0, prod: "", cons: "retire d", lus: "a b c d", hot: "cons" },
  { cells: [["d", false], ["b", false], ["c", false]], iecr: 1, ilect: 1, vides: 3, pleines: 0, prod: "", cons: "dort", lus: "a b c d", hot: "cons", consSleep: true },
];

const BUF_STEPS = [
  "Départ : tampon vide, vides = 3, pleines = 0, mutex = 1",
  "Prod dépose a : P(vides), P(mutex), case 0, V(mutex), V(pleines)",
  "Prod dépose b dans la case 1",
  "Prod dépose c ; iecr revient à 0. vides = 0 : plein",
  "Prod veut déposer d : P(vides) avec vides = 0, il s'endort",
  "Cons retire a ; son V(vides) réveille Prod, qui prend le jeton",
  "Prod range d dans la case 0, libérée ; pleines = 3",
  "Cons retire b : un jeton repasse de pleines à vides",
  "Cons retire c",
  "Cons retire d : vides = 3, pleines = 0",
  "Cons veut retirer : P(pleines) avec pleines = 0, il s'endort",
];

function Tokens({ x, n, color }: { x: number; n: number; color: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, j) => (
        <motion.circle key={j} cx={x + j * 26} cy={282} r={9} fill={color} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }} />
      ))}
    </g>
  );
}

function ActorBox({ x, name, state, hot, sleep, extra }: { x: number; name: string; state: string; hot: boolean; sleep?: boolean; extra?: string }) {
  return (
    <g>
      <rect x={x} y={70} width={170} height={92} fill={C.paper} stroke={sleep ? C.red : hot ? C.ink : C.lineStrong} strokeWidth={hot ? 2 : 1} strokeDasharray={sleep ? "5 4" : undefined} />
      <text x={x + 12} y={92} fill={C.ink} fontSize={14} fontWeight={600}>
        {name}
      </text>
      <motion.text key={state} x={x + 12} y={116} fill={sleep ? C.red : C.text} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {state}
      </motion.text>
      {extra && (
        <text x={x + 12} y={146} fill={C.weak} fontSize={12}>
          {extra}
        </text>
      )}
    </g>
  );
}

function BoundedBuffer({ i }: { i: number }) {
  const b = BUF[i];
  const sum = b.vides + b.pleines;
  const cellX = (k: number) => 236 + k * 84;
  return (
    <svg viewBox="0 0 720 310" className="w-full max-w-[720px]" role="img" aria-label="Tampon borné à trois cases avec les sémaphores vides, pleines et mutex">
      <motion.text key={`s${i}`} x={360} y={22} textAnchor="middle" fill={sum === 3 ? C.text : C.orange} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        vides + pleines = {sum}
        {sum !== 3 ? " (dépôt en cours)" : ""}
      </motion.text>
      <ActorBox x={10} name="Prod" state={b.prod} hot={b.hot === "prod"} sleep={b.prodSleep} />
      <ActorBox x={540} name="Cons" state={b.cons} hot={b.hot === "cons"} sleep={b.consSleep} extra={b.lus ? `lus : ${b.lus}` : undefined} />

      {b.cells.map(([v, full], k) => (
        <g key={k}>
          <rect x={cellX(k)} y={84} width={72} height={60} fill={full ? C.blue : C.fill} fillOpacity={full ? 0.16 : 1} stroke={full ? C.blue : C.lineStrong} strokeWidth={full ? 1.5 : 1} />
          <text x={cellX(k) + 6} y={98} fill={C.faint} fontSize={12}>
            {k}
          </text>
          <motion.text key={`${v}${full}`} x={cellX(k) + 36} y={121} textAnchor="middle" fill={full ? C.ink : C.faint} fontSize={18} fontWeight={full ? 600 : 400} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
            {v}
          </motion.text>
        </g>
      ))}
      <motion.g initial={false} animate={{ x: cellX(b.iecr) + 36 }} transition={{ duration: 0.5 }}>
        <polygon points="-7,64 7,64 0,76" fill={C.green} />
        <text y={58} textAnchor="middle" fill={C.green} fontSize={12}>
          iecr
        </text>
      </motion.g>
      <motion.g initial={false} animate={{ x: cellX(b.ilect) + 36 }} transition={{ duration: 0.5 }}>
        <polygon points="-7,164 7,164 0,152" fill={C.purple} />
        <text y={180} textAnchor="middle" fill={C.purple} fontSize={12}>
          ilect
        </text>
      </motion.g>

      {[
        { x: 40, w: 220, name: "vides", n: b.vides, color: C.green },
        { x: 280, w: 220, name: "pleines", n: b.pleines, color: C.blue },
        { x: 520, w: 150, name: "mutex", n: 1, color: C.yellow },
      ].map((s) => (
        <g key={s.name}>
          <rect x={s.x} y={226} width={s.w} height={76} fill={C.paper} stroke={C.lineStrong} />
          <motion.text key={`${s.name}${s.n}`} x={s.x + 12} y={248} fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {s.name} = {s.n}
          </motion.text>
          <Tokens x={s.x + 24} n={s.n} color={s.color} />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4. Le piège : l'ordre inversé
// ---------------------------------------------------------------------------

type Order = "bon" | "inverse";

const ORDER_STEPS: Record<Order, string[]> = {
  inverse: [
    "Tampon plein : vides = 0, pleines = 3, mutex = 1",
    "Prod fait P(mutex) d'abord : mutex 1 → 0",
    "Prod fait P(vides) avec vides = 0 : il dort en gardant le mutex",
    "Cons fait P(pleines) : pleines 3 → 2",
    "Cons fait P(mutex) avec mutex = 0 : il dort aussi. Interblocage",
  ],
  bon: [
    "Tampon plein : vides = 0, pleines = 3, mutex = 1",
    "Prod fait P(vides) d'abord : vides = 0, il dort, sans le mutex",
    "Cons fait P(pleines) : pleines 3 → 2",
    "Cons fait P(mutex), retire a, puis V(mutex) : le mutex est libre",
    "Cons fait V(vides) : Prod se réveille, prend le mutex et dépose",
  ],
};

interface OrderState {
  vides: number;
  mutex: number;
  pleines: number;
  holds?: "prod" | "cons";
  prodWaits?: "vides";
  consWaits?: "mutex";
  prod: string;
  cons: string;
  verdict?: { text: string; color: string };
}

function orderState(mode: Order, i: number): OrderState {
  if (mode === "inverse") {
    return [
      { vides: 0, mutex: 1, pleines: 3, prod: "veut déposer", cons: "" },
      { vides: 0, mutex: 0, pleines: 3, holds: "prod", prod: "P(mutex) ✓", cons: "" },
      { vides: 0, mutex: 0, pleines: 3, holds: "prod", prodWaits: "vides", prod: "dort, garde le mutex", cons: "" },
      { vides: 0, mutex: 0, pleines: 2, holds: "prod", prodWaits: "vides", prod: "dort, garde le mutex", cons: "P(pleines) ✓" },
      {
        vides: 0,
        mutex: 0,
        pleines: 2,
        holds: "prod",
        prodWaits: "vides",
        consWaits: "mutex",
        prod: "dort, garde le mutex",
        cons: "dort sur le mutex",
        verdict: { text: "chacun attend l'autre : interblocage ✗", color: C.red },
      },
    ][i] as OrderState;
  }
  return [
    { vides: 0, mutex: 1, pleines: 3, prod: "veut déposer", cons: "" },
    { vides: 0, mutex: 1, pleines: 3, prodWaits: "vides", prod: "dort, sans mutex", cons: "" },
    { vides: 0, mutex: 1, pleines: 2, prodWaits: "vides", prod: "dort, sans mutex", cons: "P(pleines) ✓" },
    { vides: 0, mutex: 1, pleines: 2, prodWaits: "vides", prod: "dort, sans mutex", cons: "a lu a, mutex rendu" },
    { vides: 0, mutex: 1, pleines: 2, prod: "réveillé, dépose", cons: "V(vides) ✓", verdict: { text: "Prod a pris le jeton rendu : tout avance ✓", color: C.green } },
  ][i] as OrderState;
}

function OrderTrap({ mode, i }: { mode: Order; i: number }) {
  const s = orderState(mode, i);
  const boxes = [
    { key: "vides", x: 40, n: s.vides, color: C.green },
    { key: "mutex", x: 260, n: s.mutex, color: C.yellow },
    { key: "pleines", x: 480, n: s.pleines, color: C.blue },
  ];
  return (
    <svg viewBox="0 0 680 270" className="w-full max-w-[680px]" role="img" aria-label="Ordre des P dans le producteur : bon ordre ou interblocage">
      <ArrowMarkers />
      {[
        { x: 20, name: "Prod", state: s.prod, sleep: s.prodWaits !== undefined },
        { x: 490, name: "Cons", state: s.cons, sleep: s.consWaits !== undefined },
      ].map((a) => (
        <g key={a.name}>
          <rect x={a.x} y={30} width={170} height={70} fill={C.paper} stroke={a.sleep ? C.red : C.lineStrong} strokeDasharray={a.sleep ? "5 4" : undefined} />
          <text x={a.x + 12} y={52} fill={C.ink} fontSize={14} fontWeight={600}>
            {a.name}
          </text>
          <motion.text key={a.state} x={a.x + 12} y={78} fill={a.sleep ? C.red : C.text} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {a.state}
          </motion.text>
        </g>
      ))}
      {boxes.map((b) => (
        <g key={b.key}>
          <rect x={b.x} y={170} width={160} height={64} fill={C.paper} stroke={C.lineStrong} />
          <motion.text key={`${b.key}${b.n}`} x={b.x + 12} y={192} fill={C.ink} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {b.key} = {b.n}
          </motion.text>
          {Array.from({ length: b.n }, (_, j) => (
            <circle key={j} cx={b.x + 24 + j * 24} cy={216} r={8} fill={b.color} />
          ))}
        </g>
      ))}
      {s.holds === "prod" && (
        <motion.line x1={300} y1={168} x2={150} y2={104} stroke={C.text} strokeWidth={2} markerEnd="url(#arr-text)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
      )}
      {s.holds === "prod" && (
        <text x={190} y={132} fill={C.text} fontSize={12}>
          détient
        </text>
      )}
      {s.prodWaits && (
        <motion.line x1={90} y1={102} x2={110} y2={166} stroke={C.red} strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#arr-red)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      )}
      {s.consWaits && (
        <motion.line x1={540} y1={102} x2={384} y2={166} stroke={C.red} strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#arr-red)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      )}
      {(s.prodWaits || s.consWaits) && (
        <text x={20} y={130} fill={C.red} fontSize={12}>
          attend
        </text>
      )}
      {s.verdict && (
        <motion.text x={340} y={260} textAnchor="middle" fill={s.verdict.color} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          {s.verdict.text}
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Semaphores() {
  const [k, setK] = useState(1);
  const [order, setOrder] = useState<Order>("inverse");
  return (
    <>
      <Section title="L'idée">
        <Idea>Un sémaphore est une boîte à jetons : un compteur et une file. P prend un jeton ou s'endort ; V rend un jeton et réveille un thread qui attend.</Idea>
        <p>Un producteur rapide, un consommateur lent, et entre les deux un tampon de 3 cases.</p>
        <p>Tampon plein : le producteur attend. Tampon vide : le consommateur attend. Les sémaphores comptent les cases et endorment le bon thread.</p>
      </Section>

      <Section title="La boîte à jetons">
        <Stepper steps={TOKEN_STEPS} interval={2200} caption="Exemple du cours : s = 2 au départ. À la fin, T1 n'a plus de jeton, T2 et T3 en ont un chacun.">
          {(i) => <TokenBox i={i} />}
        </Stepper>
        <table className="ftable">
          <thead>
            <tr>
              <th>Cours</th>
              <th>POSIX</th>
              <th>Effet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>—</td>
              <td>
                <code>sem_init(&amp;s, 0, valeur)</code>
              </td>
              <td>valeur = nombre de jetons au départ ; 0 = partagé entre les threads d'un même processus</td>
            </tr>
            <tr>
              <td>P</td>
              <td>
                <code>sem_wait(&amp;s)</code>
              </td>
              <td>prend un jeton, ou dort s'il n'y en a pas</td>
            </tr>
            <tr>
              <td>V</td>
              <td>
                <code>sem_post(&amp;s)</code>
              </td>
              <td>rend un jeton ; si un thread dormait, il repart avec</td>
            </tr>
            <tr>
              <td>—</td>
              <td>
                <code>sem_destroy(&amp;s)</code>
              </td>
              <td>libère le sémaphore à la fin</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="La valeur initiale décide de l'usage">
        <Figure caption="Cinq threads font P. Seuls ceux qui ont eu un jeton entrent ; les autres attendent un V.">
          <div className="space-y-4">
            <Slider label="valeur initiale k" value={k} min={0} max={3} onChange={setK} />
            <InitValue k={k} />
          </div>
        </Figure>
      </Section>

      <Section title="Le tampon borné pas à pas">
        <p>
          Trois sémaphores : <strong>vides</strong> compte les cases libres (N au départ), <strong>pleines</strong> compte les messages (0), <strong>mutex</strong> protège les indices (1).
        </p>
        <Code
          lang="c"
          mark={[2, 7]}
          code={`void deposer(m) {
    P(vides);  P(mutex);
    tampon[iecr] = m;  iecr = (iecr + 1) % N;
    V(mutex);  V(pleines);
}
m = retirer() {
    P(pleines);  P(mutex);
    m = tampon[ilect];  ilect = (ilect + 1) % N;
    V(mutex);  V(vides);
}`}
        />
        <Stepper steps={BUF_STEPS} interval={2400} caption="Exemple du cours : N = 3, messages a, b, c, d. Entre deux opérations, vides + pleines = 3, le nombre de cases.">
          {(i) => <BoundedBuffer i={i} />}
        </Stepper>
      </Section>

      <Section title="Le piège : l'ordre inversé">
        <p>Dans déposer, on prend d'abord le mutex, puis un jeton vides. Tampon plein.</p>
        <Choice
          label="déposer"
          options={[
            { value: "inverse", label: "P(mutex) puis P(vides)" },
            { value: "bon", label: "P(vides) puis P(mutex)" },
          ]}
          value={order}
          onChange={setOrder}
        />
        <Stepper steps={ORDER_STEPS[order]} interval={2200} caption="Règle : toujours le sémaphore de comptage avant le mutex. Ne jamais dormir en tenant un mutex.">
          {(i) => <OrderTrap mode={order} i={i} />}
        </Stepper>
      </Section>

      <Section title="Le code à connaître">
        <p>Version du TP Channel : deux mutex (un par côté), donc une lecture et une écriture en même temps.</p>
        <Code
          mark={[1, 6]}
          code={`sem_wait(&c->case_libres);      // P : une case libre, sinon dormir
mtx_lock(&c->mutex_write);
c->tab[c->i_write] = msg;
c->i_write = (c->i_write + 1) % c->n;
mtx_unlock(&c->mutex_write);
sem_post(&c->case_occupees);    // V : APRÈS l'écriture, réveille un consommateur`}
        />
        <p>
          Valeurs initiales : <code>sem_init(&amp;c-&gt;case_libres, 0, N)</code> et <code>sem_init(&amp;c-&gt;case_occupees, 0, 0)</code>. pop fait l'inverse : il prend dans case_occupees et rend dans case_libres.
        </p>
        <p>Ce tampon borné, c'est exactement un channel de Go :</p>
        <Code
          lang="go"
          code={`ch := make(chan string, 3)  // tampon de 3 cases
ch <- "a"                   // envoyer = déposer : bloque si plein
m := <-ch                   // recevoir = retirer : bloque si vide`}
        />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Sémaphore = compteur de jetons (jamais négatif) + file de threads.</li>
          <li>P (sem_wait) prend un jeton ou dort ; V (sem_post) rend un jeton et réveille un thread.</li>
          <li>Valeur initiale 1 : exclusion mutuelle. k : au plus k dedans. 0 : attendre un événement.</li>
          <li>Tampon borné de N cases : vides = N, pleines = 0, mutex = 1.</li>
          <li>Entre deux opérations, vides + pleines = N.</li>
          <li>Toujours le sémaphore de comptage avant le mutex.</li>
        </Points>
        <Trap>
          <p>
            <strong>P(mutex) avant P(vides)</strong> : le producteur dort en gardant le mutex, le consommateur ne peut plus entrer. Interblocage. Au TP Channel (deux mutex séparés), le programme finissait quand même, mais en 46 s au lieu de 16 s.
          </p>
          <p>
            <strong>Pas de while autour de sem_wait.</strong> Le sémaphore a une mémoire : un sem_post sans personne qui attend n'est pas perdu. Une condition, elle, oublie un signal envoyé à une file vide.
          </p>
        </Trap>
        <Reveal question={<p>Tampon de N cases. Valeurs initiales de vides, pleines et mutex ?</p>}>
          <p>
            <strong>vides = N</strong> (toutes les cases sont libres), <strong>pleines = 0</strong> (aucun message), <strong>mutex = 1</strong> (un seul thread touche les indices à la fois).
          </p>
        </Reveal>
        <Reveal question={<p>N = 3. Le producteur a déposé a, b, c. Que valent vides, pleines et iecr ? Que fait déposer(d) ?</p>}>
          <p>
            vides = 0, pleines = 3, iecr = 0 (il a fait le tour). déposer(d) bloque sur P(vides). Le premier retirer lit a, et son V(vides) réveille le producteur, qui range d dans la case 0.
          </p>
        </Reveal>
        <Reveal question={<p>On inverse P(mutex) et P(vides) dans déposer. Le tampon est plein. Que se passe-t-il ?</p>}>
          <p>
            Le producteur prend le mutex, trouve vides = 0 et s'endort avec. Le consommateur prend un jeton pleines, puis demande le mutex : il s'endort aussi. Chacun attend l'autre pour toujours : <strong>interblocage</strong>.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
