"use client";
// Fiche MPI : processus sans mémoire partagée, Send/Recv, interblocage de
// l'échange symétrique et ses remèdes, collectives, coût d'un message.
// Sources : CM MPI (vidéo app-03-mpi) et sujet du TP1 MPI.
import { useEffect, useState, type ReactNode } from "react";
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
} from "../kit";

// ---------------------------------------------------------------------------
// Petits éléments de dessin

/** Espaces fines entre les milliers : 1000000 → « 1 000 000 ». */
function fmt(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Lettres grecques : la police mono n'a pas β et τ lisibles, on passe en sans-serif. */
const GREEK = { fontFamily: "var(--font-sans)" } as const;
function G({ children }: { children: ReactNode }) {
  return <span style={GREEK}>{children}</span>;
}

/** Enveloppe centrée en (0, 0). */
function Env({ w = 44, color = C.blue, label }: { w?: number; color?: string; label?: string }) {
  const h = Math.round(w * 0.68);
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2} fill={C.paper} stroke={color} strokeWidth={1.8} />
      <path d={`M${-w / 2},${-h / 2} L0,${h * 0.05} L${w / 2},${-h / 2}`} fill="none" stroke={color} strokeWidth={1.4} />
      {label && (
        <text x={0} y={h / 2 - 3} textAnchor="middle" fill={C.ink} fontSize={12}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Sablier qui se retourne : « j'attends ». */
function Sablier({ x, y, color = C.red }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <motion.g
        animate={{ rotate: [0, 0, 180] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", times: [0, 0.7, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <path d="M-7,-10 H7 L-7,10 H7 Z" fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      </motion.g>
    </g>
  );
}

/** Cadenas fermé (rouge) ou ouvert (vert). */
function Cadenas({ x, y, open }: { x: number; y: number; open: boolean }) {
  const col = open ? C.green : C.red;
  return (
    <g transform={`translate(${x},${y})`}>
      <motion.path
        d="M-5,-1 V-6 A5,5 0 0 1 5,-6 V-1"
        fill="none"
        stroke={col}
        strokeWidth={1.8}
        animate={{ y: open ? -4 : 0 }}
        transition={{ duration: 0.25 }}
      />
      <rect x={-7} y={-1} width={14} height={11} rx={1.5} fill={col} />
    </g>
  );
}

function Replay({ onClick, label = "Rejouer" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
    >
      ↻ {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 01 · Quatre processus, quatre mémoires

const PX = [20, 195, 370, 545]; // abscisse des boîtes de rang (largeur 155)

function Processus() {
  const [run, setRun] = useState(0);
  const sent = run > 0;
  return (
    <Figure caption="Quatre copies du même programme, chacune avec sa mémoire. Pour que le rang 2 connaisse x, le rang 0 doit le lui envoyer.">
      <div className="space-y-3">
        <motion.svg
          viewBox="0 0 720 250"
          className="w-full max-w-[720px]"
          role="img"
          aria-label="Quatre processus MPI ; le rang 0 envoie x = 42 au rang 2"
          onViewportEnter={() => setRun((r) => (r === 0 ? 1 : r))}
          viewport={{ once: true, amount: 0.7 }}
        >
          <ArrowMarkers />
          <text x={20} y={22} fill={C.ink} fontSize={14}>
            {"$ mpirun -np 4 ./prog"}
          </text>
          <text x={700} y={22} textAnchor="end" fill={C.weak} fontSize={13}>
            {"size = 4 dans chaque copie"}
          </text>
          {PX.map((x, k) => (
            <g key={k}>
              <rect x={x} y={92} width={155} height={112} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
              <text x={x + 12} y={112} fill={C.weak} fontSize={12}>
                {"mémoire privée"}
              </text>
              <rect x={x + 12} y={122} width={131} height={30} fill={C.paper} stroke={C.line} />
              {[0, 1, 2].map((c) => (
                <rect key={c} x={x + 12 + c * 45} y={162} width={41} height={28} fill={C.paper} stroke={C.line} />
              ))}
              <text x={x + 77} y={228} textAnchor="middle" fill={C.ink} fontSize={14}>
                {`rang ${k}`}
              </text>
              {k !== 2 && (
                <text x={x + 77} y={142} textAnchor="middle" fill={k === 0 ? C.blue : C.faint} fontSize={14}>
                  {k === 0 ? "x = 42" : "x = ?"}
                </text>
              )}
            </g>
          ))}
          {/* case x du rang 2 : « ? » puis 42 à l'arrivée du message */}
          <motion.text
            key={`x2-${run}`}
            x={447}
            y={142}
            textAnchor="middle"
            fontSize={14}
            initial={{ opacity: sent ? 0 : 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: sent ? 1.7 : 0, duration: 0.3 }}
            fill={sent ? C.green : C.faint}
          >
            {sent ? "x = 42" : "x = ?"}
          </motion.text>
          <path d="M97,88 Q272,18 447,88" fill="none" stroke={C.blue} strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#arr-blue)" opacity={0.7} />
          <text x={272} y={44} textAnchor="middle" fill={C.weak} fontSize={12}>
            {"message"}
          </text>
          <motion.g
            key={`env-${run}`}
            initial={{ x: 97, y: 137, opacity: sent ? 1 : 0 }}
            animate={
              sent
                ? { x: [97, 97, 272, 447, 447], y: [137, 88, 52, 88, 137], opacity: [1, 1, 1, 1, 0] }
                : { x: 97, y: 137, opacity: 0 }
            }
            transition={{ duration: 1.9, ease: "easeInOut" }}
          >
            <Env label="42" />
          </motion.g>
        </motion.svg>
        <Replay onClick={() => setRun((r) => r + 1)} label="Renvoyer x" />
      </div>
    </Figure>
  );
}

const ORDERS = [
  [2, 0, 3, 1],
  [0, 3, 1, 2],
  [1, 2, 0, 3],
  [3, 0, 2, 1],
];

function Terminal() {
  const [k, setK] = useState(0);
  const order = ORDERS[k % ORDERS.length];
  return (
    <div className="border border-line bg-weak font-mono text-[13px] leading-[1.7]">
      <div className="px-4 py-3">
        <div className="text-fg-weak">$ mpicc prog.c -o prog</div>
        <div className="text-fg-weak">$ mpirun -np 4 ./prog</div>
        {order.map((r) => (
          <motion.div key={r} layout transition={{ duration: 0.45 }} className="text-fg-strong">
            rang {r} sur 4
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2">
        <Replay onClick={() => setK((v) => v + 1)} label="Relancer" />
        <span className="text-fg-weak">exécution n° {k + 1} : l&apos;ordre des lignes change</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 02 · MPI_Send et MPI_Recv

const SR_STEPS = [
  "Les données : adresse, nombre, type",
  "L'enveloppe : destinataire, étiquette, communicateur",
  "MPI_Send prend les 6, dans cet ordre",
  "MPI_Recv : la source au lieu de la destination, plus &status",
  "Les enveloppes correspondent : 42 arrive chez le rang 1",
];

function SendRecvSvg({ step }: { step: number }) {
  const data = ["adresse : &x", "nombre : 1", "type : MPI_INT"];
  const env = ["rang : 1", "étiquette : 0", "comm : MPI_COMM_WORLD"];
  const done = step >= 4;
  return (
    <svg viewBox="0 0 720 310" className="w-full max-w-[720px]" role="img" aria-label="Les arguments de MPI_Send et MPI_Recv">
      <ArrowMarkers />
      {/* l'enveloppe du message */}
      <rect x={40} y={8} width={640} height={112} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
      <line x1={360} y1={8} x2={360} y2={120} stroke={C.lineStrong} />
      <text x={60} y={32} fill={C.blue} fontSize={13}>
        {"DONNÉES"}
      </text>
      <text x={380} y={32} fill={C.purple} fontSize={13}>
        {"ENVELOPPE"}
      </text>
      {data.map((d, k) => (
        <motion.text
          key={d}
          x={60}
          y={60 + k * 24}
          fill={C.ink}
          fontSize={14}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + k * 0.2 }}
        >
          {d}
        </motion.text>
      ))}
      {env.map((d, k) => (
        <motion.text
          key={d}
          x={380}
          y={60 + k * 24}
          fill={C.ink}
          fontSize={14}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: step >= 1 ? 1 : 0.12, x: 0 }}
          transition={{ delay: step >= 1 ? 0.15 + k * 0.2 : 0 }}
        >
          {d}
        </motion.text>
      ))}

      {/* les deux appels */}
      <motion.text x={40} y={160} fontSize={14} fill={C.ink} animate={{ opacity: step >= 2 ? 1 : 0.12 }}>
        <tspan>{"MPI_Send("}</tspan>
        <tspan fill={C.blue}>{"&x, 1, MPI_INT"}</tspan>
        <tspan>{", "}</tspan>
        <tspan fill={C.purple}>{"1, 0, MPI_COMM_WORLD"}</tspan>
        <tspan>{");"}</tspan>
      </motion.text>
      <motion.text x={40} y={190} fontSize={14} fill={C.ink} animate={{ opacity: step >= 3 ? 1 : 0.12 }}>
        <tspan>{"MPI_Recv("}</tspan>
        <tspan fill={C.blue}>{"&x, 1, MPI_INT"}</tspan>
        <tspan>{", "}</tspan>
        <tspan fill={C.orange} fontWeight={700}>
          {"0"}
        </tspan>
        <tspan fill={C.purple}>{", 0, MPI_COMM_WORLD"}</tspan>
        <tspan>{", "}</tspan>
        <tspan fill={C.orange} fontWeight={700}>
          {"&status"}
        </tspan>
        <tspan>{");"}</tspan>
      </motion.text>
      <motion.text x={680} y={190} textAnchor="end" fill={C.orange} fontSize={12} animate={{ opacity: step === 3 ? 1 : 0 }}>
        {"← source, status"}
      </motion.text>

      {/* le transfert */}
      <g opacity={step >= 4 ? 1 : 0.35}>
        <rect x={60} y={222} width={180} height={70} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
        <text x={150} y={245} textAnchor="middle" fill={C.weak} fontSize={12}>
          {"rang 0"}
        </text>
        <text x={150} y={275} textAnchor="middle" fill={C.blue} fontSize={15}>
          {"x = 42"}
        </text>
        <rect x={480} y={222} width={180} height={70} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
        <text x={570} y={245} textAnchor="middle" fill={C.weak} fontSize={12}>
          {"rang 1"}
        </text>
        <motion.text
          key={done ? "x-ok" : "x-wait"}
          x={570}
          y={275}
          textAnchor="middle"
          fontSize={15}
          fill={done ? C.green : C.faint}
          initial={{ opacity: done ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: done ? 1.2 : 0 }}
        >
          {done ? "x = 42" : "x = ?"}
        </motion.text>
        <line x1={248} y1={257} x2={470} y2={257} stroke={C.blue} strokeWidth={1.5} markerEnd="url(#arr-blue)" />
      </g>
      {done && (
        <motion.g
          initial={{ x: 270, y: 257 }}
          animate={{ x: [270, 450, 450], y: 257, opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, times: [0, 0.85, 1] }}
        >
          <Env label="42" />
        </motion.g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 03 · L'échange symétrique : interblocage selon la taille

const SIZES = [10, 100, 1000, 5000, 20000, 100000, 1000000];
const SEUIL = 10000; // illustratif : la vraie valeur dépend de l'implémentation
const axisX = (n: number) => 60 + ((Math.log10(n) - 1) / 5) * 600;

function Interblocage() {
  const [k, setK] = useState(0);
  const n = SIZES[k];
  const bloque = n > SEUIL;
  const w = 26 + 4 * Math.log10(n); // l'enveloppe grossit avec n
  return (
    <Figure caption="Le seuil est illustratif : il dépend de l'implémentation de MPI, aucune valeur n'est garantie.">
      <div className="space-y-4">
        <Code
          lang="c"
          mark={bloque ? [2] : []}
          code={`int autre = 1 - rank;
MPI_Send(a, n, MPI_INT, autre, 0, MPI_COMM_WORLD);
MPI_Recv(b, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &status);`}
        />
        <Slider label="taille n (entiers)" value={k} min={0} max={SIZES.length - 1} onChange={setK} format={(i) => fmt(SIZES[i])} />
        <svg viewBox="0 0 720 250" className="w-full max-w-[720px]" role="img" aria-label="Échange symétrique : ça passe sous le seuil, interblocage au-dessus">
          <ArrowMarkers />
          {[
            { x: 40, label: "rang 0" },
            { x: 500, label: "rang 1" },
          ].map((b) => (
            <g key={b.label}>
              <rect
                x={b.x}
                y={20}
                width={180}
                height={110}
                rx={3}
                fill={C.fill}
                stroke={bloque ? C.red : C.lineStrong}
                strokeWidth={1.5}
                strokeDasharray={bloque ? "6 4" : undefined}
              />
              <text x={b.x + 90} y={44} textAnchor="middle" fill={C.ink} fontSize={14}>
                {b.label}
              </text>
              <text x={b.x + 90} y={118} textAnchor="middle" fill={bloque ? C.red : C.weak} fontSize={12}>
                {bloque ? "bloqué dans MPI_Send" : "Send, puis Recv"}
              </text>
            </g>
          ))}
          {bloque ? (
            <g key="bloque">
              <line x1={284} y1={62} x2={436} y2={62} stroke={C.red} strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#arr-red)" />
              <line x1={436} y1={96} x2={284} y2={96} stroke={C.red} strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#arr-red)" />
              <text x={360} y={128} textAnchor="middle" fill={C.red} fontSize={12}>
                {"chacun attend que l'autre reçoive"}
              </text>
              <g transform="translate(252,62)">
                <Env w={w} color={C.blue} />
              </g>
              <g transform="translate(468,96)">
                <Env w={w} color={C.orange} />
              </g>
              <Sablier x={70} y={80} />
              <Sablier x={650} y={80} />
            </g>
          ) : (
            <g key="passe">
              <line x1={262} y1={62} x2={458} y2={62} stroke={C.blue} strokeWidth={1.2} markerEnd="url(#arr-blue)" opacity={0.5} />
              <line x1={458} y1={96} x2={262} y2={96} stroke={C.orange} strokeWidth={1.2} markerEnd="url(#arr-orange)" opacity={0.5} />
              <motion.g
                initial={{ x: 240, y: 62 }}
                animate={{ x: [240, 480], y: 62 }}
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
              >
                <Env w={w} color={C.blue} />
              </motion.g>
              <motion.g
                initial={{ x: 480, y: 96 }}
                animate={{ x: [480, 240], y: 96 }}
                transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
              >
                <Env w={w} color={C.orange} />
              </motion.g>
            </g>
          )}
          {/* voyant */}
          <circle cx={150} cy={164} r={8} fill={bloque ? C.red : C.green} />
          <text x={166} y={169} fill={bloque ? C.red : C.green} fontSize={14}>
            {bloque ? "bloqué : chacun attend l'autre, pour toujours" : "ça passe : MPI recopie le message et rend la main"}
          </text>
          {/* échelle logarithmique de n */}
          <line x1={60} y1={214} x2={axisX(SEUIL)} y2={214} stroke={C.green} strokeWidth={4} opacity={0.5} />
          <line x1={axisX(SEUIL)} y1={214} x2={660} y2={214} stroke={C.red} strokeWidth={4} opacity={0.5} />
          {[10, 100, 1000, 10000, 100000, 1000000].map((t) => (
            <g key={t}>
              <line x1={axisX(t)} y1={209} x2={axisX(t)} y2={219} stroke={C.weak} />
              <text x={axisX(t)} y={237} textAnchor="middle" fill={C.weak} fontSize={12}>
                {fmt(t)}
              </text>
            </g>
          ))}
          <line x1={axisX(SEUIL)} y1={190} x2={axisX(SEUIL)} y2={222} stroke={C.ink} strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={axisX(SEUIL) + 6} y={198} fill={C.ink} fontSize={12}>
            {"seuil (dépend de l'implémentation)"}
          </text>
          <motion.circle
            cy={214}
            r={7}
            fill={bloque ? C.red : C.green}
            stroke={C.paper}
            strokeWidth={2}
            initial={false}
            animate={{ cx: axisX(n) }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          />
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 04 · Les remèdes

type Remede = "parite" | "sendrecv";

const PARITE_STEPS = [
  "Rang pair : Send puis Recv ; rang impair : Recv puis Send",
  "Créneau 1 : le Send du rang 0 rencontre le Recv du rang 1",
  "Créneau 2 : le Recv du rang 0 rencontre le Send du rang 1",
  "Échange terminé, sans interblocage",
];
const SENDRECV_STEPS = [
  "Chaque rang appelle MPI_Sendrecv, une seule fois",
  "MPI fait l'envoi et la réception ensemble : les messages se croisent",
  "Les deux appels rendent la main : échange terminé",
];

const ROW = [60, 160]; // ordonnée des frises du rang 0 et du rang 1

function Frises({ cursor }: { cursor: number }) {
  return (
    <>
      {ROW.map((y, r) => (
        <g key={r}>
          <text x={20} y={y + 5} fill={C.ink} fontSize={14}>
            {`rang ${r}`}
          </text>
          <line x1={100} y1={y} x2={700} y2={y} stroke={C.line} strokeWidth={1.5} />
        </g>
      ))}
      <motion.line
        y1={28}
        y2={192}
        stroke={C.weak}
        strokeDasharray="4 4"
        initial={false}
        animate={{ x1: cursor, x2: cursor }}
        transition={{ duration: 0.6 }}
      />
      <text x={700} y={206} textAnchor="end" fill={C.weak} fontSize={12}>
        {"temps →"}
      </text>
    </>
  );
}

type BlocState = "avant" | "actif" | "fini";

function Bloc({ x, w, y, label, color, state }: { x: number; w: number; y: number; label: string; color: string; state: BlocState }) {
  return (
    <motion.g initial={false} animate={{ opacity: state === "avant" ? 0.5 : 1 }}>
      <rect x={x} y={y - 15} width={w} height={30} rx={3} fill={C.paper} />
      <rect
        x={x}
        y={y - 15}
        width={w}
        height={30}
        rx={3}
        fill={color}
        fillOpacity={state === "actif" ? 0.22 : 0.1}
        stroke={color}
        strokeWidth={state === "actif" ? 2 : 1.2}
      />
      <text x={x + w / 2} y={y + 5} textAnchor="middle" fill={C.ink} fontSize={13}>
        {label}
      </text>
      {state === "fini" && (
        <text x={x + w - 8} y={y + 5} textAnchor="end" fill={C.green} fontSize={14}>
          {"✓"}
        </text>
      )}
    </motion.g>
  );
}

function PariteSvg({ step }: { step: number }) {
  const st = (slot: number): BlocState => (step < slot ? "avant" : step === slot ? "actif" : "fini");
  return (
    <svg viewBox="0 0 720 210" className="w-full max-w-[720px]" role="img" aria-label="Frise de l'échange par parité">
      <ArrowMarkers />
      <Frises cursor={[115, 250, 540, 690][step]} />
      <Bloc x={130} w={240} y={ROW[0]} label="MPI_Send" color={C.blue} state={st(1)} />
      <Bloc x={130} w={240} y={ROW[1]} label="MPI_Recv" color={C.orange} state={st(1)} />
      <Bloc x={420} w={240} y={ROW[0]} label="MPI_Recv" color={C.orange} state={st(2)} />
      <Bloc x={420} w={240} y={ROW[1]} label="MPI_Send" color={C.blue} state={st(2)} />
      {step === 1 && (
        <g key="down">
          <line x1={250} y1={78} x2={250} y2={142} stroke={C.blue} strokeWidth={1.5} markerEnd="url(#arr-blue)" />
          <motion.g initial={{ x: 280, y: 92 }} animate={{ x: 280, y: 128 }} transition={{ duration: 1.1, ease: "easeInOut" }}>
            <Env w={36} label="a" />
          </motion.g>
        </g>
      )}
      {step === 2 && (
        <g key="up">
          <line x1={540} y1={142} x2={540} y2={78} stroke={C.blue} strokeWidth={1.5} markerEnd="url(#arr-blue)" />
          <motion.g initial={{ x: 570, y: 128 }} animate={{ x: 570, y: 92 }} transition={{ duration: 1.1, ease: "easeInOut" }}>
            <Env w={36} label="a" />
          </motion.g>
        </g>
      )}
    </svg>
  );
}

function SendrecvSvg({ step }: { step: number }) {
  const state: BlocState = step <= 1 ? "actif" : "fini";
  return (
    <svg viewBox="0 0 720 210" className="w-full max-w-[720px]" role="img" aria-label="Frise de l'échange avec MPI_Sendrecv">
      <ArrowMarkers />
      <Frises cursor={[115, 395, 690][step]} />
      <Bloc x={130} w={530} y={ROW[0]} label="MPI_Sendrecv" color={C.purple} state={state} />
      <Bloc x={130} w={530} y={ROW[1]} label="MPI_Sendrecv" color={C.purple} state={state} />
      {step === 1 && (
        <g key="cross">
          <line x1={330} y1={78} x2={330} y2={142} stroke={C.blue} strokeWidth={1.5} markerEnd="url(#arr-blue)" />
          <line x1={460} y1={142} x2={460} y2={78} stroke={C.orange} strokeWidth={1.5} markerEnd="url(#arr-orange)" />
          <motion.g initial={{ x: 300, y: 92 }} animate={{ x: 300, y: 128 }} transition={{ duration: 1.1, ease: "easeInOut" }}>
            <Env w={36} label="a" />
          </motion.g>
          <motion.g initial={{ x: 490, y: 128 }} animate={{ x: 490, y: 92 }} transition={{ duration: 1.1, ease: "easeInOut" }}>
            <Env w={36} color={C.orange} label="a" />
          </motion.g>
        </g>
      )}
    </svg>
  );
}

const SENDRECV_ARGS = [
  { args: ["a", "n", "MPI_INT", "autre", "0"], label: "envoi : 5", color: C.blue },
  { args: ["b", "n", "MPI_INT", "autre", "0"], label: "réception : 5", color: C.orange },
  { args: ["MPI_COMM_WORLD", "&status"], label: "comm + status : 2", color: C.weak },
];

function SendrecvArgs() {
  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-3 border border-line bg-weak px-4 py-3 font-mono text-[13px]">
      <span className="pt-1 text-fg-strong">MPI_Sendrecv(</span>
      {SENDRECV_ARGS.map((g, k) => (
        <div key={g.label} className="flex flex-col">
          <span className="border-b-2 px-1 pb-1 text-fg-strong" style={{ borderColor: g.color }}>
            {g.args.join(", ") + (k < SENDRECV_ARGS.length - 1 ? "," : "")}
          </span>
          <span className="mt-1 text-[12px]" style={{ color: g.color }}>
            {g.label}
          </span>
        </div>
      ))}
      <span className="pt-1 text-fg-strong">)</span>
      <span className="basis-full text-fg-weak">= 12 arguments</span>
    </div>
  );
}

function Remedes() {
  const [r, setR] = useState<Remede>("parite");
  return (
    <div className="space-y-4">
      <Choice
        label="Remède"
        options={[
          { value: "parite", label: "1. parité du rang" },
          { value: "sendrecv", label: "2. MPI_Sendrecv" },
        ]}
        value={r}
        onChange={setR}
      />
      {r === "parite" ? (
        <>
          <Code
            lang="c"
            code={`if (rank % 2 == 0) {
    MPI_Send(a, n, MPI_INT, autre, 0, MPI_COMM_WORLD);
    MPI_Recv(b, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &status);
} else {
    MPI_Recv(b, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &status);
    MPI_Send(a, n, MPI_INT, autre, 0, MPI_COMM_WORLD);
}`}
          />
          <Stepper key="p" steps={PARITE_STEPS} interval={2000}>
            {(i) => <PariteSvg step={i} />}
          </Stepper>
        </>
      ) : (
        <>
          <Code
            lang="c"
            code={`MPI_Sendrecv(a, n, MPI_INT, autre, 0,
             b, n, MPI_INT, autre, 0,
             MPI_COMM_WORLD, &status);`}
          />
          <SendrecvArgs />
          <Stepper key="s" steps={SENDRECV_STEPS} interval={2000}>
            {(i) => <SendrecvSvg step={i} />}
          </Stepper>
        </>
      )}
    </div>
  );
}

// Non bloquant : frise de 0 à 10 (unités arbitraires)
const tx = (t: number) => 160 + t * 50;

function NonBloquant() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((v) => {
        if (v >= 10) {
          setPlaying(false);
          return 10;
        }
        return Math.min(10, Math.round((v + 0.25) * 100) / 100);
      });
    }, 110);
    return () => clearInterval(id);
  }, [playing]);
  const libres = t >= 6;
  const mark = t < 0.5 ? [2, 3] : t < 5 ? [4] : t < 6 ? [5] : [];
  const bars = [
    { label: "communication", y: 50, a: 0, b: 6, color: C.blue },
    { label: "calcul_local", y: 86, a: 0, b: 5, color: C.green },
    { label: "MPI_Waitall", y: 122, a: 5, b: 6, color: C.weak },
  ];
  return (
    <Figure caption="Unités de temps arbitraires (exemple du cours). La communication avance pendant le calcul ; Waitall n'attend que ce qui reste.">
      <div className="space-y-4">
        <Code
          lang="c"
          mark={mark}
          code={`MPI_Request req[2];
MPI_Irecv(b, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &req[0]);
MPI_Isend(a, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &req[1]);
calcul_local();   /* ne touche ni a ni b */
MPI_Waitall(2, req, MPI_STATUSES_IGNORE);`}
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[260px] flex-1">
            <Slider
              label="temps t"
              value={t}
              min={0}
              max={10}
              step={0.25}
              onChange={(v) => {
                setPlaying(false);
                setT(v);
              }}
              format={(v) => v.toFixed(1).replace(".", ",")}
            />
          </div>
          <Replay
            onClick={() => {
              setT(0);
              setPlaying(true);
            }}
            label="Lecture"
          />
        </div>
        <svg viewBox="0 0 720 220" className="w-full max-w-[720px]" role="img" aria-label="Frise : communication pendant le calcul, puis MPI_Waitall">
          <text x={20} y={25} fill={C.ink} fontSize={13}>
            {"tampons"}
          </text>
          {["a", "b"].map((nm, k) => (
            <g key={nm}>
              <rect
                x={100 + k * 74}
                y={8}
                width={52}
                height={24}
                rx={3}
                fill={libres ? C.green : C.red}
                fillOpacity={0.12}
                stroke={libres ? C.green : C.red}
                strokeWidth={1.5}
              />
              <text x={116 + k * 74} y={25} textAnchor="middle" fill={C.ink} fontSize={14}>
                {nm}
              </text>
              <Cadenas x={137 + k * 74} y={17} open={libres} />
            </g>
          ))}
          <text x={260} y={25} fill={libres ? C.green : C.red} fontSize={13}>
            {libres ? "requêtes finies : a et b utilisables" : "requêtes en cours : ne pas toucher à a ni à b"}
          </text>
          {bars.map((b) => {
            const fill = Math.max(0, Math.min(t, b.b) - b.a);
            return (
              <g key={b.label}>
                <text x={150} y={b.y + 16} textAnchor="end" fill={C.ink} fontSize={13}>
                  {b.label}
                </text>
                <rect x={tx(b.a)} y={b.y} width={(b.b - b.a) * 50} height={22} fill="none" stroke={b.color} strokeDasharray="4 3" opacity={0.6} />
                <rect x={tx(b.a)} y={b.y} width={fill * 50} height={22} fill={b.color} fillOpacity={0.35} stroke={b.color} />
              </g>
            );
          })}
          {t > 0 && t < 6 && (
            <g transform={`translate(${tx(t) - 16},${61})`}>
              <Env w={26} />
            </g>
          )}
          <line x1={tx(0)} y1={170} x2={tx(10)} y2={170} stroke={C.lineStrong} />
          {Array.from({ length: 11 }, (_, k) => (
            <g key={k}>
              <line x1={tx(k)} y1={166} x2={tx(k)} y2={174} stroke={C.weak} />
              <text x={tx(k)} y={192} textAnchor="middle" fill={C.weak} fontSize={12}>
                {k}
              </text>
            </g>
          ))}
          <line x1={tx(t)} y1={40} x2={tx(t)} y2={176} stroke={C.ink} strokeWidth={1.5} />
          <text x={tx(10)} y={212} textAnchor="end" fill={C.weak} fontSize={12}>
            {"temps"}
          </text>
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 05 · Les collectives

type Op = "Bcast" | "Scatter" | "Gather" | "Reduce" | "Allreduce" | "Oubli";

const OPS: { value: Op; label: string }[] = [
  { value: "Bcast", label: "Bcast" },
  { value: "Scatter", label: "Scatter" },
  { value: "Gather", label: "Gather" },
  { value: "Reduce", label: "Reduce" },
  { value: "Allreduce", label: "Allreduce" },
  { value: "Oubli", label: "un rang oublie" },
];

const OP_INFO: Record<Op, { code: string; text: string }> = {
  Bcast: {
    code: "MPI_Bcast(&n, 1, MPI_INT, 0, MPI_COMM_WORLD);",
    text: "La racine (rang 0) envoie la même valeur à tous.",
  },
  Scatter: {
    code: "MPI_Scatter(tab, 2, MPI_INT, part, 2, MPI_INT, 0, MPI_COMM_WORLD);\nint s = part[0] + part[1];",
    text: "La racine découpe tab en 4 morceaux de 2 entiers ; le rang r reçoit le r-ième. Puis chacun somme sa part, sans communiquer.",
  },
  Gather: {
    code: "MPI_Gather(part, 2, MPI_INT, tab, 2, MPI_INT, 0, MPI_COMM_WORLD);",
    text: "L'inverse de Scatter : chacun envoie son morceau, la racine les recolle dans l'ordre des rangs.",
  },
  Reduce: {
    code: "MPI_Reduce(&s, &total, 1, MPI_INT, MPI_SUM, 0, MPI_COMM_WORLD);",
    text: "Les s sont combinés par MPI_SUM ; seule la racine a le résultat.",
  },
  Allreduce: {
    code: "MPI_Allreduce(&s, &total, 1, MPI_INT, MPI_SUM, MPI_COMM_WORLD);",
    text: "Comme Reduce, mais sans racine : tout le monde a le résultat.",
  },
  Oubli: {
    code: "if (rank != 2)   /* FAUX : le rang 2 saute la collective */\n    MPI_Reduce(&s, &total, 1, MPI_INT, MPI_SUM, 0, MPI_COMM_WORLD);",
    text: "Une collective doit être appelée par tous, dans le même ordre. Sinon les autres attendent : le programme est faux.",
  },
};

const CX = [100, 272, 444, 616]; // centres des boîtes de rang
const BLOCK_COLORS = [C.blue, C.orange, C.green, C.purple];
const PARTS = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
];
const SUMS = [3, 7, 11, 15];
const SLOT_Y = 212; // haut de la case de données dans une boîte

function Cell({ x, y, w = 30, v, color }: { x: number; y: number; w?: number; v: string | number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={28} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + 19} textAnchor="middle" fill={C.ink} fontSize={14}>
        {v}
      </text>
    </g>
  );
}

function RankBoxes({ dim = -1, waiting = [] }: { dim?: number; waiting?: number[] }) {
  return (
    <>
      {CX.map((cx, k) => (
        <g key={k} opacity={k === dim ? 0.4 : 1}>
          <rect x={cx - 70} y={180} width={140} height={92} rx={3} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
          <text x={cx} y={200} textAnchor="middle" fill={C.ink} fontSize={13}>
            {k === 0 ? "rang 0 (racine)" : `rang ${k}`}
          </text>
          {waiting.includes(k) && <Sablier x={cx + 54} y={226} />}
        </g>
      ))}
    </>
  );
}

function Result({ k, text, delay, color = C.ink }: { k: number; text: string; delay: number; color?: string }) {
  return (
    <motion.text x={CX[k]} y={262} textAnchor="middle" fill={color} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}>
      {text}
    </motion.text>
  );
}

function CollectiveSvg({ op }: { op: Op }) {
  const move = { duration: 0.9, ease: "easeInOut" } as const;
  const top = op === "Scatter" || op === "Gather" ? 18 : 100; // haut du dessin utile
  let body: ReactNode = null;

  if (op === "Bcast") {
    body = (
      <>
        <Cell x={CX[0] - 20} y={SLOT_Y} w={40} v="n" color={C.blue} />
        {[1, 2, 3].map((k) => (
          <motion.g
            key={k}
            initial={{ x: 0, y: 0 }}
            animate={{ x: [0, (CX[k] - CX[0]) / 2, CX[k] - CX[0]], y: [0, -78, 0] }}
            transition={{ ...move, duration: 1.1, delay: 0.3 + 0.2 * k }}
          >
            <Cell x={CX[0] - 20} y={SLOT_Y} w={40} v="n" color={C.blue} />
          </motion.g>
        ))}
        {[0, 1, 2, 3].map((k) => (
          <Result key={k} k={k} text={k === 0 ? "n (envoyé)" : "n reçu"} delay={1.9} color={C.green} />
        ))}
      </>
    );
  } else if (op === "Scatter" || op === "Gather") {
    const scatter = op === "Scatter";
    body = (
      <>
        <text x={30} y={38} fill={C.weak} fontSize={12}>
          {scatter ? "tab, sur le rang 0" : "tab, sur le rang 0 (rempli à la fin)"}
        </text>
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={30 + i * 32} y={48} width={30} height={28} fill="none" stroke={C.line} strokeDasharray="3 3" />
        ))}
        {PARTS.map((p, k) => {
          const dx = CX[k] - 31 - (30 + 64 * k);
          const dy = SLOT_Y - 48;
          return (
            <motion.g
              key={k}
              initial={scatter ? { x: 0, y: 0 } : { x: dx, y: dy }}
              animate={scatter ? { x: dx, y: dy } : { x: 0, y: 0 }}
              transition={{ ...move, delay: 0.4 + 0.25 * k }}
            >
              <Cell x={30 + 64 * k} y={48} v={p[0]} color={BLOCK_COLORS[k]} />
              <Cell x={62 + 64 * k} y={48} v={p[1]} color={BLOCK_COLORS[k]} />
            </motion.g>
          );
        })}
        {scatter
          ? SUMS.map((s, k) => <Result key={k} k={k} text={`s = ${s}`} delay={2.0} color={BLOCK_COLORS[k]} />)
          : [0, 1, 2, 3].map((k) => (
              <Result key={k} k={k} text={k === 0 ? "tab = 1 … 8" : "a envoyé part"} delay={1.9} color={k === 0 ? C.green : C.weak} />
            ))}
      </>
    );
  } else if (op === "Reduce" || op === "Allreduce") {
    const all = op === "Allreduce";
    body = (
      <>
        {SUMS.map((s, k) => (
          <g key={`fixe-${k}`} opacity={0.35}>
            <Cell x={CX[k] - 20} y={SLOT_Y} w={40} v={s} color={BLOCK_COLORS[k]} />
          </g>
        ))}
        {SUMS.map((s, k) => {
          const dx = 14 + 44 * k - (CX[k] - 20);
          return (
            <motion.g
              key={k}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: dx, y: 120 - SLOT_Y, opacity: [1, 1, 0] }}
              transition={{
                x: { ...move, delay: 0.3 + 0.15 * k },
                y: { ...move, delay: 0.3 + 0.15 * k },
                opacity: { delay: 1.6, duration: 0.3 },
              }}
            >
              <Cell x={CX[k] - 20} y={SLOT_Y} w={40} v={s} color={BLOCK_COLORS[k]} />
            </motion.g>
          );
        })}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
          <Cell x={70} y={120} w={60} v={36} color={C.green} />
          <text x={140} y={139} fill={C.ink} fontSize={13}>
            {"MPI_SUM : 3 + 7 + 11 + 15 = 36"}
          </text>
        </motion.g>
        {all &&
          [1, 2, 3].map((k) => (
            <motion.g
              key={`c-${k}`}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x: CX[k] - 100, y: 120, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1, delay: 2.2, ease: "easeInOut" }}
            >
              <Cell x={80} y={120} w={40} v={36} color={C.green} />
            </motion.g>
          ))}
        <Result k={0} text="total = 36" delay={1.9} color={C.green} />
        {[1, 2, 3].map((k) => (
          <Result key={k} k={k} text={all ? "total = 36" : "total = ?"} delay={all ? 3.1 : 1.9} color={all ? C.green : C.faint} />
        ))}
      </>
    );
  } else {
    body = (
      <>
        {SUMS.map((s, k) =>
          k === 2 ? null : (
            <g key={k}>
              <Cell x={CX[k] - 20} y={SLOT_Y} w={40} v={s} color={BLOCK_COLORS[k]} />
            </g>
          ),
        )}
        <text x={CX[2]} y={232} textAnchor="middle" fill={C.weak} fontSize={12}>
          {"saute l'appel"}
        </text>
        <motion.text x={360} y={130} textAnchor="middle" fill={C.red} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {"les rangs 0, 1 et 3 attendent le rang 2 : programme faux"}
        </motion.text>
      </>
    );
  }

  return (
    <svg viewBox={`0 ${top} 720 ${285 - top}`} className="w-full max-w-[720px]" role="img" aria-label={`Collective MPI : ${op}`}>
      <ArrowMarkers />
      <RankBoxes dim={op === "Oubli" ? 2 : -1} waiting={op === "Oubli" ? [0, 1, 3] : []} />
      {body}
    </svg>
  );
}

function Collectives() {
  const [op, setOp] = useState<Op>("Scatter");
  const [run, setRun] = useState(0);
  const info = OP_INFO[op];
  return (
    <Figure caption="Exemple du cours : additionner 1 à 8 sur 4 processus. Scatter, somme locale, puis Reduce : total = 36 sur le rang 0.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Choice
            options={OPS}
            value={op}
            onChange={(v) => {
              setOp(v);
              setRun((r) => r + 1);
            }}
          />
          <Replay onClick={() => setRun((r) => r + 1)} />
        </div>
        <p className="text-[15px]">{info.text}</p>
        <Code lang="c" code={info.code} />
        <motion.div onViewportEnter={() => setRun((r) => (r === 0 ? 1 : r))} viewport={{ once: true, amount: 0.6 }}>
          <CollectiveSvg key={`${op}-${run}`} op={op} />
        </motion.div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 06 · Coût d'un message et diffusion en arbre

const BETA = 2;
const TAU = 0.5;
const cX = (l: number) => 70 + l * 30;
const cY = (T: number) => 220 - T * 15;

function CoutMessage() {
  const [l, setL] = useState(4);
  const T = BETA + l * TAU;
  const pct = Math.round((BETA / T) * 100);
  return (
    <Figure
      caption={
        <>
          Unités arbitraires du cours : <G>β</G> = 2, <G>τ</G> = 0,5. Petit message : la latence domine. Gros message : la taille domine.
        </>
      }
    >
      <div className="space-y-4">
        <Slider label="taille l" value={l} min={0} max={20} onChange={setL} />
        <svg viewBox="0 0 720 250" className="w-full max-w-[720px]" role="img" aria-label="Coût d'un message : T = β + l·τ">
          <ArrowMarkers />
          <rect x={cX(0)} y={cY(BETA)} width={cX(20) - cX(0)} height={cY(0) - cY(BETA)} fill={C.blue} fillOpacity={0.12} />
          <text x={cX(20) - 6} y={cY(0) - 10} textAnchor="end" fill={C.blue} fontSize={12}>
            <tspan style={GREEK}>{"β"}</tspan>
            {" : latence, payée par chaque message"}
          </text>
          <line x1={cX(0)} y1={cY(0)} x2={cX(20) + 12} y2={cY(0)} stroke={C.weak} markerEnd="url(#arr-weak)" />
          <line x1={cX(0)} y1={cY(0)} x2={cX(0)} y2={cY(12.5)} stroke={C.weak} markerEnd="url(#arr-weak)" />
          <text x={cX(20) + 14} y={cY(0) + 18} textAnchor="end" fill={C.weak} fontSize={12}>
            {"l (octets)"}
          </text>
          <text x={cX(0) - 10} y={cY(12.5) + 4} textAnchor="end" fill={C.weak} fontSize={12}>
            {"T"}
          </text>
          {[0, 5, 10, 15].map((v) => (
            <text key={v} x={cX(v)} y={cY(0) + 18} textAnchor="middle" fill={C.weak} fontSize={12}>
              {v}
            </text>
          ))}
          {[2, 6, 10].map((v) => (
            <text key={v} x={cX(0) - 8} y={cY(v) + 4} textAnchor="end" fill={C.weak} fontSize={12}>
              {v}
            </text>
          ))}
          <line x1={cX(0)} y1={cY(BETA)} x2={cX(20)} y2={cY(BETA + 20 * TAU)} stroke={C.ink} strokeWidth={2} />
          {/* le point courant et sa décomposition */}
          <motion.line initial={false} animate={{ x1: cX(l), x2: cX(l), y1: cY(0), y2: cY(BETA) }} stroke={C.blue} strokeWidth={4} />
          <motion.line initial={false} animate={{ x1: cX(l), x2: cX(l), y1: cY(BETA), y2: cY(T) }} stroke={C.orange} strokeWidth={4} />
          <motion.circle initial={false} animate={{ cx: cX(l), cy: cY(T) }} r={6} fill={C.orange} stroke={C.paper} strokeWidth={2} />
          <text x={90} y={34} fill={C.ink} fontSize={14}>
            {`T = 2 + 0,5 × ${l} = ${String(T).replace(".", ",")}`}
          </text>
          <text x={90} y={56} fontSize={13}>
            <tspan fill={C.blue}>{`latence : ${pct} %`}</tspan>
            <tspan fill={C.orange} dx={18}>{`taille / débit : ${100 - pct} %`}</tspan>
          </text>
        </svg>
      </div>
    </Figure>
  );
}

const DIFF_STEPS = [
  "Seul le rang 0 a la donnée",
  "Étape 1 — un par un : 0 → 1 ; arbre : 0 → 2",
  "Étape 2 — un par un : 0 → 2 ; arbre : 0 → 1 et 2 → 3 en même temps",
  "Étape 3 — un par un : 0 → 3 ; l'arbre a fini depuis l'étape 2",
];

const NODE_Y = 150;

function Arc({ xa, xb, active, color }: { xa: number; xb: number; active: boolean; color: "blue" | "green" }) {
  const h = 40 + 0.3 * Math.abs(xb - xa);
  const y0 = NODE_Y - 20;
  const mid = (xa + xb) / 2;
  return (
    <g>
      <path
        d={`M${xa},${y0} Q${mid},${y0 - h} ${xb},${y0}`}
        fill="none"
        stroke={C[color]}
        strokeWidth={1.5}
        opacity={active ? 1 : 0.35}
        markerEnd={`url(#arr-${color})`}
      />
      {active && (
        <motion.g
          initial={{ x: xa, y: y0 }}
          animate={{ x: [xa, mid, xb], y: [y0, y0 - h / 2, y0], opacity: [1, 1, 0] }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <Env w={26} color={C[color]} />
        </motion.g>
      )}
    </g>
  );
}

function Noeud({ x, k, on }: { x: number; k: number; on: boolean }) {
  return (
    <g>
      <motion.circle
        cx={x}
        cy={NODE_Y}
        r={19}
        initial={false}
        animate={{ fillOpacity: on ? 0.3 : 0 }}
        fill={C.green}
        stroke={on ? C.green : C.lineStrong}
        strokeWidth={1.8}
      />
      <text x={x} y={NODE_Y + 5} textAnchor="middle" fill={C.ink} fontSize={14}>
        {k}
      </text>
    </g>
  );
}

function DiffusionSvg({ step }: { step: number }) {
  const L = [50, 130, 210, 290];
  const R = [420, 500, 580, 660];
  const leftOn = (k: number) => k <= step;
  const rightOn = (k: number) => k === 0 || (k === 2 && step >= 1) || step >= 2;
  return (
    <svg viewBox="0 0 720 220" className="w-full max-w-[720px]" role="img" aria-label="Diffusion un par un contre diffusion en arbre binomial">
      <ArrowMarkers />
      <line x1={355} y1={10} x2={355} y2={210} stroke={C.line} />
      <text x={170} y={24} textAnchor="middle" fill={C.ink} fontSize={14}>
        {"un par un : p − 1 étapes"}
      </text>
      <text x={540} y={24} textAnchor="middle" fill={C.ink} fontSize={14}>
        {"arbre binomial : ⌈log2 p⌉ étapes"}
      </text>
      {[1, 2, 3].map((k) => (k <= step ? <Arc key={`l${k}-${step === k}`} xa={L[0]} xb={L[k]} active={step === k} color="blue" /> : null))}
      {step >= 1 && <Arc key={`r02-${step === 1}`} xa={R[0]} xb={R[2]} active={step === 1} color="green" />}
      {step >= 2 && <Arc key={`r01-${step === 2}`} xa={R[0]} xb={R[1]} active={step === 2} color="green" />}
      {step >= 2 && <Arc key={`r23-${step === 2}`} xa={R[2]} xb={R[3]} active={step === 2} color="green" />}
      {L.map((x, k) => (
        <Noeud key={`L${k}`} x={x} k={k} on={leftOn(k)} />
      ))}
      {R.map((x, k) => (
        <Noeud key={`R${k}`} x={x} k={k} on={rightOn(k)} />
      ))}
      <text x={170} y={204} textAnchor="middle" fill={step >= 3 ? C.green : C.weak} fontSize={13}>
        {`étapes : ${step}${step >= 3 ? " — fini" : ""}`}
      </text>
      <text x={540} y={204} textAnchor="middle" fill={step >= 2 ? C.green : C.weak} fontSize={13}>
        {`étapes : ${Math.min(step, 2)}${step >= 2 ? " — fini" : ""}`}
      </text>
    </svg>
  );
}

const PS = [2, 3, 4, 8, 16];
const ceilLog2 = (p: number) => {
  let k = 0;
  while (2 ** k < p) k++;
  return k;
};

function BarresDiffusion() {
  const [i, setI] = useState(4);
  const p = PS[i];
  const bars = [
    { label: "un par un : p − 1", v: p - 1, color: C.blue },
    { label: "arbre : ⌈log2 p⌉", v: ceilLog2(p), color: C.green },
  ];
  return (
    <Figure caption="Pour 16 processus : 4 étapes en arbre au lieu de 15.">
      <div className="space-y-4">
        <Slider label="processus p" value={i} min={0} max={PS.length - 1} onChange={setI} format={(k) => String(PS[k])} />
        <svg viewBox="0 0 720 120" className="w-full max-w-[720px]" role="img" aria-label="Nombre d'étapes de diffusion selon p">
          {bars.map((b, k) => (
            <g key={b.label}>
              <text x={20} y={38 + k * 52} fill={C.ink} fontSize={13}>
                {b.label}
              </text>
              <motion.rect
                x={190}
                y={20 + k * 52}
                height={28}
                fill={b.color}
                fillOpacity={0.3}
                stroke={b.color}
                initial={false}
                animate={{ width: Math.max(2, b.v * 26) }}
                transition={{ type: "spring", stiffness: 180, damping: 24 }}
              />
              <motion.text
                y={39 + k * 52}
                fill={b.color}
                fontSize={14}
                initial={false}
                animate={{ x: 200 + b.v * 26 }}
                transition={{ type: "spring", stiffness: 180, damping: 24 }}
              >
                {`${b.v} étape${b.v > 1 ? "s" : ""}`}
              </motion.text>
            </g>
          ))}
        </svg>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 07 · Code à connaître

type Snip = "squelette" | "sendrecv" | "echange" | "nonbloquant" | "collectives" | "commandes";

const SNIPPETS: Record<Snip, { lang: string; code: string }> = {
  squelette: {
    lang: "c",
    code: `#include <mpi.h>
#include <stdio.h>

int main(int argc, char **argv) {
    int rank, size;
    MPI_Init(&argc, &argv);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    printf("rang %d sur %d\\n", rank, size);
    MPI_Finalize();
    return 0;
}`,
  },
  sendrecv: {
    lang: "c",
    code: `MPI_Status status;
int x = 42;   /* significatif sur le rang 0 */
if (rank == 0)
    MPI_Send(&x, 1, MPI_INT, 1, 0, MPI_COMM_WORLD);
else if (rank == 1)
    MPI_Recv(&x, 1, MPI_INT, 0, 0, MPI_COMM_WORLD, &status);`,
  },
  echange: {
    lang: "c",
    code: `int autre = 1 - rank;
/* FAUX au-delà du seuil : MPI_Send puis MPI_Recv des deux côtés.
   Correct, en un seul appel : */
MPI_Sendrecv(a, n, MPI_INT, autre, 0,
             b, n, MPI_INT, autre, 0,
             MPI_COMM_WORLD, &status);`,
  },
  nonbloquant: {
    lang: "c",
    code: `MPI_Request req[2];
MPI_Irecv(b, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &req[0]);
MPI_Isend(a, n, MPI_INT, autre, 0, MPI_COMM_WORLD, &req[1]);
calcul_local();   /* ne touche ni a ni b */
MPI_Waitall(2, req, MPI_STATUSES_IGNORE);
/* ici seulement, a et b sont de nouveau utilisables */`,
  },
  collectives: {
    lang: "c",
    code: `int tab[8] = {1, 2, 3, 4, 5, 6, 7, 8};   /* significatif sur le rang 0 */
int part[2], total;
MPI_Scatter(tab, 2, MPI_INT, part, 2, MPI_INT, 0, MPI_COMM_WORLD);
int s = part[0] + part[1];                 /* 3, 7, 11, 15 */
MPI_Reduce(&s, &total, 1, MPI_INT, MPI_SUM, 0, MPI_COMM_WORLD);
/* total = 36, sur le rang 0 seulement */`,
  },
  commandes: {
    lang: "bash",
    code: `mpicc prog.c -o prog          # compile (surcouche du compilateur C)
mpirun -np 4 ./prog           # lance 4 copies
# TP : 40 copies sur les 4 machines de listemachines.txt (10 par machine)
mpirun --hostfile listemachines.txt -np 40 ./hello`,
  },
};

const SNIP_OPTS: { value: Snip; label: string }[] = [
  { value: "squelette", label: "squelette" },
  { value: "sendrecv", label: "Send / Recv" },
  { value: "echange", label: "échange" },
  { value: "nonbloquant", label: "non bloquant" },
  { value: "collectives", label: "Scatter + Reduce" },
  { value: "commandes", label: "commandes" },
];

function CodeTabs() {
  const [s, setS] = useState<Snip>("squelette");
  return (
    <div className="space-y-3">
      <Choice options={SNIP_OPTS} value={s} onChange={setS} />
      <Code lang={SNIPPETS[s].lang} code={SNIPPETS[s].code} />
    </div>
  );
}

/** Anneau à jeton du TP : le jeton fait le tour 0 → 1 → 2 → 3 → 0. */
const RING = [
  { x: 90, y: 30 },
  { x: 150, y: 90 },
  { x: 90, y: 150 },
  { x: 30, y: 90 },
];

function Anneau() {
  const loop = [...RING, RING[0]];
  return (
    <svg viewBox="0 0 180 180" className="w-[150px] shrink-0" role="img" aria-label="Anneau à jeton sur 4 processus">
      <circle cx={90} cy={90} r={60} fill="none" stroke={C.line} strokeWidth={1.5} strokeDasharray="4 4" />
      {RING.map((p, k) => (
        <g key={k}>
          <circle cx={p.x} cy={p.y} r={17} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
          <text x={p.x} y={p.y + 5} textAnchor="middle" fill={C.ink} fontSize={14}>
            {k}
          </text>
        </g>
      ))}
      <motion.circle
        r={7}
        fill={C.orange}
        initial={{ cx: 90, cy: 30 }}
        animate={{ cx: loop.map((p) => p.x), cy: loop.map((p) => p.y) }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Mpi() {
  return (
    <>
      <Section title="L'idée">
        <Idea>
          MPI lance p copies du même programme. Chacune a sa propre mémoire : une donnée ne se partage qu&apos;en l&apos;envoyant dans un message.
        </Idea>
        <p>
          Chaque copie connaît son <strong>rang</strong>, de 0 à p − 1, et le nombre total <strong>size</strong> = p.
        </p>
        <p>Le rang décide de ce que fait chaque copie : qui envoie, qui reçoit, quelle part du travail.</p>
        <Processus />
        <p>Les copies tournent en même temps : l&apos;ordre des affichages change d&apos;une exécution à l&apos;autre.</p>
        <Terminal />
      </Section>

      <Section title="MPI_Send et MPI_Recv">
        <p>
          Un message = des <strong>données</strong> (adresse, nombre, type), puis une <strong>enveloppe</strong> (rang, étiquette, communicateur).
        </p>
        <Stepper steps={SR_STEPS} interval={2200}>
          {(i) => <SendRecvSvg step={i} />}
        </Stepper>
        <div className="overflow-x-auto">
          <table className="ftable">
            <thead>
              <tr>
                <th>arguments</th>
                <th>MPI_Send</th>
                <th>MPI_Recv</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 à 3 : données</td>
                <td colSpan={2}>
                  <code>buf, nb, type</code> (ex. <code>&amp;x, 1, MPI_INT</code>)
                </td>
              </tr>
              <tr>
                <td>4 : l&apos;autre processus</td>
                <td>
                  <code>dest</code>
                </td>
                <td>
                  <code>source</code>
                </td>
              </tr>
              <tr>
                <td>5 et 6</td>
                <td colSpan={2}>
                  <code>tag</code> (étiquette), <code>comm</code> (<code>MPI_COMM_WORLD</code>)
                </td>
              </tr>
              <tr>
                <td>7</td>
                <td>—</td>
                <td>
                  <code>&amp;status</code> : qui a envoyé, avec quelle étiquette
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Le message est reçu quand les enveloppes correspondent : bonne source, bonne étiquette, même communicateur.</p>
        <p>
          <code>MPI_Recv</code> bloque jusqu&apos;à l&apos;arrivée du message. Avec <code>MPI_ANY_TAG</code>, on accepte toute étiquette, et le <code>status</code> dit laquelle est arrivée (TP : contre-maître et travailleurs).
        </p>
      </Section>

      <Section title="L'échange symétrique peut bloquer">
        <p>Deux processus échangent leurs tableaux : chacun envoie d&apos;abord, puis reçoit.</p>
        <Interblocage />
        <Points title="Pourquoi ça dépend de la taille">
          <li>
            <strong>Petit message</strong> : MPI le recopie dans un tampon interne, et <code>MPI_Send</code> rend la main tout de suite (protocole souvent appelé <em>eager</em>).
          </li>
          <li>
            <strong>Gros message</strong> : <code>MPI_Send</code> attend que la réception ait commencé chez l&apos;autre (protocole <em>rendez-vous</em>).
          </li>
          <li>Les deux sont dans leur Send, aucun n&apos;atteint son Recv : chacun attend l&apos;autre, pour toujours.</li>
        </Points>
        <Trap>
          <p>
            Le bug n&apos;apparaît qu&apos;au-delà d&apos;une taille qui dépend de l&apos;implémentation. Un test qui passe avec n = 10 ne prouve rien : le programme est faux.
          </p>
        </Trap>
      </Section>

      <Section title="Trois remèdes">
        <p>Chaque envoi doit rencontrer une réception, ou MPI doit gérer les deux ensemble.</p>
        <Remedes />
        <p>
          <strong>3. Non bloquant</strong> : <code>MPI_Isend</code> et <code>MPI_Irecv</code> lancent la communication et rendent la main tout de suite, avec une requête (<code>MPI_Request</code>, à la place du <code>status</code>).
        </p>
        <NonBloquant />
        <Trap title="Règle d'or du non bloquant">
          <p>
            Ne pas toucher au tampon (a ou b) avant la fin de la requête, donc avant <code>MPI_Wait</code> / <code>MPI_Waitall</code>.
          </p>
        </Trap>
      </Section>

      <Section title="Les collectives">
        <p>Une collective implique tout le communicateur : tous les processus l&apos;appellent, la racine comprise.</p>
        <Collectives />
        <div className="overflow-x-auto">
          <table className="ftable">
            <thead>
              <tr>
                <th>collective</th>
                <th>avant</th>
                <th>après</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>MPI_Bcast</code>
                </td>
                <td>racine : n</td>
                <td>tous : n</td>
              </tr>
              <tr>
                <td>
                  <code>MPI_Scatter</code>
                </td>
                <td>racine : tab[8]</td>
                <td>rang r : tab[2r], tab[2r+1]</td>
              </tr>
              <tr>
                <td>
                  <code>MPI_Gather</code>
                </td>
                <td>rang r : part[2]</td>
                <td>racine : tab[8], dans l&apos;ordre des rangs</td>
              </tr>
              <tr>
                <td>
                  <code>MPI_Reduce</code>
                </td>
                <td>rang r : s</td>
                <td>racine seule : total = somme des s</td>
              </tr>
              <tr>
                <td>
                  <code>MPI_Allreduce</code>
                </td>
                <td>rang r : s</td>
                <td>tous : total (pas d&apos;argument racine)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Trap>
          <p>
            Une collective est appelée par <strong>tous</strong>, dans le <strong>même ordre</strong>. Une collective dans un <code>if (rank == 0)</code> fait attendre les autres : le programme est faux.
          </p>
        </Trap>
      </Section>

      <Section title="Le coût d'un message">
        <Formula>
          T(l) = <G>β</G> + l·<G>τ</G> &nbsp;&nbsp;·&nbsp;&nbsp; <G>β</G> : latence &nbsp;·&nbsp; l·<G>τ</G> : taille / débit
        </Formula>
        <p>Chaque message paie une latence fixe β, puis l·τ pour ses l octets.</p>
        <CoutMessage />
        <p>Donc : mieux vaut peu de gros messages que beaucoup de petits.</p>
        <p>Dans une même machine, latence et débit sont bien meilleurs qu&apos;entre deux machines (TP1 MPI).</p>
        <p>
          <strong>Diffuser depuis la racine</strong> : un par un, il faut p − 1 envois successifs. En arbre binomial, chaque processus informé transmet à son tour : 1, puis 2, puis 4 informés.
        </p>
        <Stepper steps={DIFF_STEPS} interval={2200}>
          {(i) => <DiffusionSvg step={i} />}
        </Stepper>
        <BarresDiffusion />
      </Section>

      <Section title="Le code à connaître">
        <p>Le squelette est à savoir écrire de mémoire, sans document.</p>
        <CodeTabs />
        <Note title="Dans le TP1 MPI">
          <div className="flex flex-wrap items-center gap-5">
            <Anneau />
            <ul className="flist min-w-[240px] flex-1">
              <li>
                Hello world : <code>MPI_Get_processor_name</code> donne le nom de la machine.
              </li>
              <li>
                Anneau à jeton : chacun reçoit du rang précédent et envoie au suivant ; le rang 0 crée le jeton et le reçoit du dernier. <code>MPI_Wtime()</code> mesure un tour.
              </li>
              <li>Contre-maître et travailleurs : on ne donne du travail qu&apos;à qui le demande, quand il le demande.</li>
            </ul>
          </div>
        </Note>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>p copies, p mémoires séparées ; rang de 0 à p − 1 ; on ne partage que par messages.</li>
          <li>
            <code>MPI_Send(buf, nb, type, dest, tag, comm)</code> ; <code>MPI_Recv(buf, nb, type, source, tag, comm, &amp;status)</code> : données d&apos;abord, enveloppe ensuite.
          </li>
          <li>Send puis Recv des deux côtés : interblocage au-delà d&apos;un seuil de taille qui dépend de l&apos;implémentation.</li>
          <li>
            Remèdes : parité du rang, <code>MPI_Sendrecv</code> (12 arguments), ou <code>MPI_Isend</code>/<code>MPI_Irecv</code> + <code>MPI_Waitall</code>.
          </li>
          <li>Collectives (Bcast, Scatter, Gather, Reduce, Allreduce) : appelées par tous, dans le même ordre.</li>
          <li>T = β + l·τ ; diffusion en arbre : ⌈log2 p⌉ étapes au lieu de p − 1.</li>
        </Points>
        <Trap>
          <p>
            <code>MPI_Reduce</code> ne donne le résultat qu&apos;à la racine : sur les autres rangs, <code>total</code> n&apos;est pas rempli. Pour l&apos;avoir partout : <code>MPI_Allreduce</code>.
          </p>
        </Trap>
        <Reveal
          question={
            <p>
              Deux processus font chacun <code>MPI_Send</code> vers l&apos;autre, puis <code>MPI_Recv</code>. Ça marche avec {"n\u00a0=\u00a010"} et ça bloque avec {"n\u00a0=\u00a01\u202f000\u202f000"}. Pourquoi ? Donnez deux corrections.
            </p>
          }
        >
          <p>
            Petit message : MPI le recopie dans un tampon interne et Send rend la main. Gros message : Send attend que l&apos;autre ait commencé à recevoir ; les deux restent dans leur Send : interblocage.
          </p>
          <p>
            Corrections : inverser l&apos;ordre selon la parité du rang, utiliser <code>MPI_Sendrecv</code>, ou <code>MPI_Isend</code>/<code>MPI_Irecv</code> puis <code>MPI_Waitall</code>.
          </p>
        </Reveal>
        <Reveal
          question={
            <p>
              4 processus, s vaut 3, 7, 11, 15 sur les rangs 0 à 3. Après <code>MPI_Reduce(&amp;s, &amp;total, 1, MPI_INT, MPI_SUM, 0, MPI_COMM_WORLD)</code>, que vaut total sur chaque rang ? Et avec <code>MPI_Allreduce</code> ?
            </p>
          }
        >
          <p>Reduce : total = 36 sur le rang 0 seulement ; sur les rangs 1 à 3, total n&apos;est pas rempli.</p>
          <p>Allreduce (sans argument racine) : total = 36 sur les 4 rangs.</p>
        </Reveal>
        <Reveal question={<p>Combien d&apos;étapes pour diffuser une valeur depuis la racine à 16 processus, en envoyant un par un ? En arbre binomial ?</p>}>
          <p>Un par un : p − 1 = 15 envois successifs.</p>
          <p>Arbre binomial : chaque informé transmet à son tour (1, 2, 4, 8, puis 16 informés), donc ⌈log2 16⌉ = 4 étapes.</p>
        </Reveal>
      </Section>
    </>
  );
}
