"use client";
// Fiche CM8 Fichiers : descripteurs, redirection (ls -l > liste.txt) et tube (ls -l | wc -l).
import { useState } from "react";
import { ArrowMarkers, C, Choice, Code, Figure, Formula, Idea, Points, Reveal, Section, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// 1. La table des descripteurs : printf finit en write(1, …)
// ---------------------------------------------------------------------------

function TableIntro() {
  const roles = ["entrée standard", "sortie standard", "sortie d'erreur", "libre"];
  return (
    <svg viewBox="0 0 660 200" className="w-full max-w-[660px]" role="img" aria-label="Table des descripteurs de ls">
      <ArrowMarkers />
      <rect x={10} y={10} width={330} height={176} fill={C.paper} stroke={C.lineStrong} />
      <text x={24} y={34} fill={C.ink} fontSize={15} fontWeight={600}>
        ls
      </text>
      <text x={326} y={34} textAnchor="end" fill={C.weak} fontSize={12}>
        table des descripteurs
      </text>
      {roles.map((r, k) => (
        <g key={k}>
          <rect x={200} y={48 + k * 34} width={34} height={28} fill={k === 1 ? C.fill2 : C.fill} stroke={k === 1 ? C.blue : C.lineStrong} strokeWidth={k === 1 ? 1.8 : 1} />
          <text x={217} y={67 + k * 34} textAnchor="middle" fill={C.ink} fontSize={13}>
            {k}
          </text>
          <text x={190} y={67 + k * 34} textAnchor="end" fill={k === 3 ? C.faint : C.text} fontSize={12}>
            {r}
          </text>
          {k < 3 && <line x1={236} y1={62 + k * 34} x2={498} y2={88 + k * 12} stroke={k === 1 ? C.blue : C.weak} strokeWidth={k === 1 ? 1.8 : 1.2} markerEnd={k === 1 ? "url(#arr-blue)" : "url(#arr-weak)"} />}
        </g>
      ))}
      <rect x={502} y={76} width={140} height={52} fill={C.fill} stroke={C.lineStrong} />
      <text x={572} y={107} textAnchor="middle" fill={C.ink} fontSize={13}>
        terminal
      </text>
      {/* les octets suivent la flèche de la case 1 */}
      <motion.g
        animate={{ x: [0, 216], y: [0, 4], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut", opacity: { times: [0, 0.15, 0.85, 1], duration: 2.2, repeat: Infinity, repeatDelay: 0.5 } }}
      >
        <rect x={242} y={86} width={40} height={20} fill={C.blue} fillOpacity={0.2} stroke={C.blue} />
        <text x={262} y={101} textAnchor="middle" fill={C.ink} fontSize={12}>
          a.c
        </text>
      </motion.g>
      <text x={400} y={166} fill={C.text} fontSize={12}>
        printf(&quot;a.c\n&quot;);
      </text>
      <text x={400} y={186} fill={C.blue} fontSize={12}>
        → write(1, buf, n);
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. Redirection : ls -l > liste.txt
// ---------------------------------------------------------------------------

type Tgt = "term" | "file" | "libre";

const REDIR_CODE = [
  'int fd = open("liste.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);',
  "dup2(fd, 1);",
  "close(fd);",
  "execvp(argv[0], argv);",
];

const REDIR_STEPS = [
  "Le shell (père) : 0, 1, 2 → terminal",
  "fork : le fils reçoit une copie de la table",
  "Fils : open renvoie 3, le plus petit descripteur libre",
  "Fils : dup2(fd, 1) → la case 1 désigne liste.txt",
  "Fils : close(fd) → la case 3 est libérée",
  "execvp : le fils devient ls, table inchangée ; ls écrit sur 1",
  "Père : waitpid ; sa sortie reste le terminal",
];

function redirFils(i: number): Tgt[] {
  if (i <= 1) return ["term", "term", "term", "libre"];
  if (i === 2) return ["term", "term", "term", "file"];
  if (i === 3) return ["term", "file", "term", "file"];
  return ["term", "file", "term", "libre"];
}

const FILE_LINES = ["total 12", "… 120 a.c", "… 340 b.c", "… 4096 tp"];

function Redirection({ i }: { i: number }) {
  const fils = redirFils(i);
  const codeLine = i >= 2 && i <= 5 ? i - 2 : -1;
  const termY = (k: number) => 54 + k * 9;
  const fileY = (k: number) => 214 + k * 9;
  return (
    <svg viewBox="0 0 760 400" className="w-full max-w-[760px]" role="img" aria-label="Redirection de la sortie de ls vers liste.txt">
      <ArrowMarkers />
      {/* cibles */}
      <rect x={300} y={36} width={160} height={52} fill={C.fill} stroke={C.lineStrong} />
      <text x={380} y={67} textAnchor="middle" fill={C.ink} fontSize={13}>
        terminal
      </text>
      <motion.g initial={false} animate={{ opacity: i >= 2 ? 1 : 0.25 }}>
        <rect x={300} y={196} width={160} height={92} fill={C.fill} stroke={C.green} strokeWidth={1.5} />
        <text x={380} y={215} textAnchor="middle" fill={C.green} fontSize={13}>
          liste.txt
        </text>
      </motion.g>
      {i >= 5 &&
        FILE_LINES.map((l, k) => (
          <motion.text key={l} x={314} y={235 + k * 15} fill={C.text} fontSize={12} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + k * 0.4 }}>
            {l}
          </motion.text>
        ))}

      {/* père */}
      <rect x={10} y={36} width={210} height={170} fill={C.paper} stroke={C.blue} strokeWidth={1.5} />
      <text x={24} y={58} fill={C.ink} fontSize={14} fontWeight={600}>
        shell
      </text>
      <text x={206} y={58} textAnchor="end" fill={C.blue} fontSize={12}>
        père
      </text>
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <rect x={150} y={70 + k * 32} width={30} height={26} fill={C.fill} stroke={C.lineStrong} />
          <text x={165} y={88 + k * 32} textAnchor="middle" fill={C.ink} fontSize={13}>
            {k}
          </text>
          {k < 3 && <line x1={182} y1={83 + k * 32} x2={297} y2={termY(k)} stroke={k === 1 && i === 6 ? C.blue : C.weak} strokeWidth={k === 1 && i === 6 ? 2 : 1.2} markerEnd={k === 1 && i === 6 ? "url(#arr-blue)" : "url(#arr-weak)"} />}
        </g>
      ))}
      <text x={24} y={88} fill={C.weak} fontSize={12}>
        0 entrée
      </text>
      <text x={24} y={120} fill={C.weak} fontSize={12}>
        1 sortie
      </text>
      <text x={24} y={152} fill={C.weak} fontSize={12}>
        2 erreur
      </text>
      {i === 6 && (
        <motion.text x={24} y={192} fill={C.blue} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          ⏸ waitpid(pid, …)
        </motion.text>
      )}

      {/* fils */}
      {i >= 1 && (
        <motion.g initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <rect x={540} y={36} width={210} height={170} fill={C.paper} stroke={C.orange} strokeWidth={1.5} />
          <motion.text key={i >= 5 ? "ls" : "shell"} x={554} y={58} fill={C.ink} fontSize={14} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {i >= 5 ? "ls -l" : "shell (copie)"}
          </motion.text>
          <text x={736} y={58} textAnchor="end" fill={C.orange} fontSize={12}>
            fils
          </text>
          {fils.map((t, k) => (
            <g key={k}>
              <rect x={580} y={70 + k * 32} width={30} height={26} fill={C.fill} stroke={t === "file" ? C.green : C.lineStrong} strokeWidth={t === "file" ? 1.8 : 1} />
              <text x={595} y={88 + k * 32} textAnchor="middle" fill={t === "libre" ? C.faint : C.ink} fontSize={13}>
                {k}
              </text>
              <text x={620} y={88 + k * 32} fill={t === "file" ? C.green : t === "libre" ? C.faint : C.weak} fontSize={12}>
                {t === "file" ? "liste.txt" : t === "libre" ? "libre" : "terminal"}
              </text>
              {t !== "libre" && (
                <motion.line
                  key={`${k}-${t}`}
                  x1={578}
                  y1={83 + k * 32}
                  x2={463}
                  y2={t === "file" ? fileY(k) : termY(k)}
                  stroke={t === "file" ? C.green : C.weak}
                  strokeWidth={t === "file" ? 1.8 : 1.2}
                  markerEnd={t === "file" ? "url(#arr-green)" : "url(#arr-weak)"}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </g>
          ))}
          {i === 2 && (
            <motion.text x={736} y={192} textAnchor="end" fill={C.green} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              open(…) → fd = 3
            </motion.text>
          )}
        </motion.g>
      )}

      {/* le code du fils */}
      <rect x={10} y={300} width={740} height={94} fill={C.paper} stroke={C.line} />
      <text x={20} y={318} fill={C.faint} fontSize={12}>
        dans le fils, entre fork et execvp :
      </text>
      {REDIR_CODE.map((l, k) => (
        <g key={k}>
          {k === codeLine && <motion.rect x={14} y={325 + k * 17} width={732} height={17} fill={C.orange} fillOpacity={0.14} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
          <text x={20} y={338 + k * 17} fill={k === codeLine ? C.ink : C.text} fontSize={12.5}>
            {l}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Le tube : ls -l | wc -l
// ---------------------------------------------------------------------------

type Fd = "term" | "lect" | "ecr" | "libre";
const FD_COL: Record<Fd, string> = { term: C.weak, lect: C.blue, ecr: C.orange, libre: C.faint };
const FD_LAB: Record<Fd, string> = { term: "term.", lect: "lect.", ecr: "écr.", libre: "—" };

const BASE: Fd[] = ["term", "term", "term", "lect", "ecr"];

interface TubeState {
  pere: Fd[];
  f1: Fd[] | null;
  f2: Fd[] | null;
}

const TUBE: TubeState[] = [
  { pere: BASE, f1: null, f2: null },
  { pere: BASE, f1: BASE, f2: BASE },
  { pere: BASE, f1: ["term", "ecr", "term", "lect", "ecr"], f2: BASE },
  { pere: BASE, f1: ["term", "ecr", "term", "libre", "libre"], f2: BASE },
  { pere: BASE, f1: ["term", "ecr", "term", "libre", "libre"], f2: ["lect", "term", "term", "lect", "ecr"] },
  { pere: BASE, f1: ["term", "ecr", "term", "libre", "libre"], f2: ["lect", "term", "term", "libre", "libre"] },
  { pere: ["term", "term", "term", "libre", "libre"], f1: ["term", "ecr", "term", "libre", "libre"], f2: ["lect", "term", "term", "libre", "libre"] },
  { pere: ["term", "term", "term", "libre", "libre"], f1: ["term", "ecr", "term", "libre", "libre"], f2: ["lect", "term", "term", "libre", "libre"] },
];

const TUBE_STEPS = [
  "pipe(fds) dans le père : fds[0] = 3 lecture, fds[1] = 4 écriture",
  "Deux fork : chaque fils a une copie des cases 3 et 4",
  "Fils 1 : dup2(fds[1], 1) → sa sortie va dans le tube",
  "Fils 1 : close(fds[0]) ; close(fds[1])",
  "Fils 2 : dup2(fds[0], 0) → son entrée vient du tube",
  "Fils 2 : close(fds[0]) ; close(fds[1])",
  "Père : close(fds[0]) ; close(fds[1])",
  "execvp : ls écrit sur 1, wc lit sur 0 et compte",
];

function FdBox({ x, y, title, color, fds, changed }: { x: number; y: number; title: string; color: string; fds: Fd[]; changed: boolean[] }) {
  return (
    <g>
      <rect x={x} y={y} width={250} height={92} fill={C.paper} stroke={color} strokeWidth={1.5} />
      <motion.text key={title} x={x + 12} y={y + 20} fill={C.ink} fontSize={13} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {title}
      </motion.text>
      {fds.map((t, k) => (
        <g key={k}>
          <motion.rect
            x={x + 12 + k * 46}
            y={y + 30}
            width={40}
            height={28}
            fill={C.fill}
            initial={false}
            animate={{ scale: changed[k] ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.5 }}
            stroke={t === "libre" ? C.line : FD_COL[t]}
            strokeWidth={t === "lect" || t === "ecr" ? 1.8 : 1}
          />
          <text x={x + 32 + k * 46} y={y + 49} textAnchor="middle" fill={t === "libre" ? C.faint : C.ink} fontSize={13}>
            {k}
          </text>
          <motion.text key={t} x={x + 32 + k * 46} y={y + 76} textAnchor="middle" fill={FD_COL[t]} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {FD_LAB[t]}
          </motion.text>
        </g>
      ))}
    </g>
  );
}

function Tube({ i }: { i: number }) {
  const s = TUBE[i];
  const prev = TUBE[Math.max(0, i - 1)];
  const diff = (a: Fd[] | null, b: Fd[] | null) => (a ?? []).map((t, k) => i > 0 && !!b && b[k] !== t);
  const writers = [s.pere, s.f1, s.f2].reduce((n, t) => n + (t ? t.filter((x) => x === "ecr").length : 0), 0);
  const run = i === 7;
  return (
    <svg viewBox="0 0 760 360" className="w-full max-w-[760px]" role="img" aria-label="Le tube entre ls et wc">
      <ArrowMarkers />
      <FdBox x={255} y={10} title="shell (père)" color={C.blue} fds={s.pere} changed={diff(s.pere, prev.pere)} />
      {s.f1 && (
        <motion.g initial={{ opacity: 0, x: 245, y: -240 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.7 }}>
          <FdBox x={10} y={250} title={run ? "ls -l (fils 1)" : "fils 1"} color={C.orange} fds={s.f1} changed={diff(s.f1, prev.f1)} />
        </motion.g>
      )}
      {s.f2 && (
        <motion.g initial={{ opacity: 0, x: -245, y: -240 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ duration: 0.7 }}>
          <FdBox x={500} y={250} title={run ? "wc -l (fils 2)" : "fils 2"} color={C.purple} fds={s.f2} changed={diff(s.f2, prev.f2)} />
        </motion.g>
      )}

      {/* le tube */}
      <rect x={280} y={156} width={200} height={40} rx={20} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
      <text x={380} y={148} textAnchor="middle" fill={C.ink} fontSize={13}>
        tube
      </text>
      <text x={286} y={148} fill={C.orange} fontSize={12}>
        écriture
      </text>
      <text x={474} y={148} textAnchor="end" fill={C.blue} fontSize={12}>
        lecture
      </text>
      <motion.text key={writers} x={380} y={226} textAnchor="middle" fill={C.orange} fontSize={14} initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }}>
        écrivains ouverts : {writers}
      </motion.text>

      {run && (
        <>
          <motion.path d="M 88 250 C 88 200, 200 176, 278 176" fill="none" stroke={C.orange} strokeWidth={2} markerEnd="url(#arr-orange)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
          <motion.path d="M 482 176 C 540 176, 532 210, 532 248" fill="none" stroke={C.blue} strokeWidth={2} markerEnd="url(#arr-blue)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.4 }} />
          {[0, 1, 2].map((k) => (
            <motion.circle
              key={k}
              r={5}
              fill={C.orange}
              initial={{ cx: 300, cy: 176, opacity: 0 }}
              animate={{ cx: [300, 380, 460], cy: 176, opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, delay: 0.8 + k * 0.55, repeat: Infinity, repeatDelay: 0.05 }}
            />
          ))}
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4. Le piège : la fin de fichier
// ---------------------------------------------------------------------------

type Eof = "ok" | "pere" | "wc";

const EOF_STEPS: Record<Eof, string[]> = {
  ok: ["ls écrit ses lignes dans le tube", "ls se termine : son descripteur 1 se ferme", "wc lit tout : le tube est vide", "0 écrivain et tube vide : read renvoie 0, wc affiche son compte"],
  pere: ["ls écrit ses lignes dans le tube", "ls se termine : son descripteur 1 se ferme", "wc lit tout : le tube est vide", "Il reste 1 écrivain (le 4 du père) : wc bloqué dans read, père bloqué dans waitpid"],
  wc: ["ls écrit ses lignes dans le tube", "ls se termine : son descripteur 1 se ferme", "wc lit tout : le tube est vide", "Il reste 1 écrivain : le 4 de wc lui-même. wc attend… lui-même"],
};

function EofFig({ i, mode }: { i: number; mode: Eof }) {
  const writers: { who: string; open: boolean }[] = [{ who: "ls : 1", open: i < 1 }];
  if (mode === "pere") writers.push({ who: "père : 4", open: true });
  if (mode === "wc") writers.push({ who: "wc : 4", open: true });
  const nOpen = writers.filter((w) => w.open).length;
  const blocked = i === 3 && mode !== "ok";
  const chunks = i === 0 ? 3 : i === 1 ? 3 : 0;
  return (
    <svg viewBox="0 0 760 250" className="w-full max-w-[760px]" role="img" aria-label="Fin de fichier sur un tube">
      {/* ls */}
      <motion.g initial={false} animate={{ opacity: i >= 1 ? 0.4 : 1 }}>
        <rect x={10} y={60} width={160} height={70} fill={C.paper} stroke={C.orange} strokeWidth={1.5} />
        <text x={24} y={84} fill={C.ink} fontSize={14} fontWeight={600}>
          ls -l
        </text>
        <text x={24} y={112} fill={C.weak} fontSize={12}>
          {i >= 1 ? "terminé" : "écrit sur 1"}
        </text>
      </motion.g>
      {/* tube */}
      <rect x={220} y={74} width={320} height={42} rx={21} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
      {Array.from({ length: chunks }, (_, k) => (
        <motion.rect key={k} y={84} width={50} height={22} fill={C.orange} fillOpacity={0.25} stroke={C.orange} initial={{ x: 230, opacity: 0 }} animate={{ x: 250 + k * 70, opacity: 1 }} transition={{ delay: k * 0.25 }} />
      ))}
      {chunks === 0 && (
        <text x={380} y={100} textAnchor="middle" fill={C.faint} fontSize={12}>
          vide
        </text>
      )}
      {/* wc */}
      <motion.g initial={false} animate={{ x: blocked ? [0, -6, 6, 0] : 0 }} transition={{ duration: 0.4, repeat: blocked ? Infinity : 0, repeatDelay: 1.2 }}>
        <rect x={590} y={60} width={160} height={70} fill={C.paper} stroke={blocked ? C.red : C.purple} strokeWidth={1.5} />
      </motion.g>
      <text x={604} y={84} fill={C.ink} fontSize={14} fontWeight={600}>
        wc -l
      </text>
      <motion.text key={`${i}-${mode}`} x={604} y={112} fill={i === 3 ? (blocked ? C.red : C.green) : C.weak} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {i < 3 ? "read(0, …)" : blocked ? "bloqué dans read" : "read → 0 : affiche"}
      </motion.text>
      {/* père */}
      <rect x={300} y={6} width={160} height={40} fill={C.paper} stroke={C.blue} />
      <text x={380} y={31} textAnchor="middle" fill={blocked ? C.red : C.ink} fontSize={12}>
        père : waitpid{blocked ? " ⏸ ∞" : ""}
      </text>
      {/* écrivains */}
      <text x={10} y={182} fill={C.weak} fontSize={12}>
        descripteurs d'écriture du tube :
      </text>
      {writers.map((w, k) => (
        <motion.g key={w.who} initial={false} animate={{ opacity: w.open ? 1 : 0.6 }}>
          <rect x={250 + k * 120} y={166} width={104} height={26} fill={w.open ? C.fill : "none"} stroke={w.open ? C.orange : C.line} strokeDasharray={w.open ? undefined : "4 3"} />
          <text x={302 + k * 120} y={184} textAnchor="middle" fill={w.open ? C.ink : C.faint} fontSize={12} textDecoration={w.open ? undefined : "line-through"}>
            {w.who}
          </text>
        </motion.g>
      ))}
      <motion.text key={nOpen} x={10} y={230} fill={nOpen > 0 ? C.orange : C.green} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        écrivains ouverts : {nOpen}
        {i >= 2 ? (nOpen > 0 ? "  →  pas de fin de fichier" : "  →  fin de fichier") : ""}
      </motion.text>
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Fichiers() {
  const [eof, setEof] = useState<Eof>("pere");
  return (
    <>
      <Section title="L'idée">
        <Idea>Un descripteur est un petit entier : l'indice d'une case dans la table du processus. Pour rediriger, le shell rebranche une case dans le fils, entre fork et execvp.</Idea>
        <p>
          Case 0 : entrée standard. Case 1 : sortie standard. Case 2 : sortie d'erreur. Depuis un terminal, les trois désignent le terminal.
        </p>
        <Figure caption="printf finit par appeler write sur le descripteur 1. Les octets suivent la flèche de la case 1. ls ne connaît que ce numéro.">
          <TableIntro />
        </Figure>
      </Section>

      <Section title="Redirection : ls -l > liste.txt">
        <p>Trois appels dans le fils : open, dup2, close. Puis execvp, qui garde la table telle quelle.</p>
        <Stepper steps={REDIR_STEPS} interval={2400} caption="fd = 3 : valeur d'illustration (0, 1 et 2 sont pris). En vert : ce qui mène à liste.txt.">
          {(i) => <Redirection i={i} />}
        </Stepper>
        <table className="ftable">
          <thead>
            <tr>
              <th>Appel</th>
              <th>Effet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>open(nom, O_WRONLY | O_CREAT | O_TRUNC, 0644)</code>
              </td>
              <td>ouvre en écriture, crée s'il manque, vide s'il existe ; renvoie le plus petit descripteur libre, −1 si échec</td>
            </tr>
            <tr>
              <td>
                <code>dup2(fd, 1)</code>
              </td>
              <td>la case 1 désigne le même fichier que fd</td>
            </tr>
            <tr>
              <td>
                <code>close(fd)</code>
              </td>
              <td>libère la case fd, qui ne sert plus</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Le tube : ls -l | wc -l">
        <p>
          <code>pipe(fds)</code> crée deux descripteurs : <code>fds[0]</code> pour lire, <code>fds[1]</code> pour écrire. Ce qui entre par l'écriture ressort, dans le même ordre, par la lecture.
        </p>
        <p>On appelle pipe avant fork : les deux fils héritent du même tube.</p>
        <Stepper steps={TUBE_STEPS} interval={2400} caption="fds = {3, 4} : valeurs d'illustration. Sous chaque case : term. = terminal, lect. = tube (lecture), écr. = tube (écriture), — = libre.">
          {(i) => <Tube i={i} />}
        </Stepper>
      </Section>

      <Section title="Le piège : la fin de fichier">
        <p>wc lit jusqu'à la fin de fichier. Sur un tube, cette fin n'arrive qu'à une condition :</p>
        <Formula>read renvoie 0 (fin de fichier) ⇔ tube vide ET aucun descripteur d'écriture ouvert</Formula>
        <div className="space-y-3">
          <Choice
            label="Scénario"
            options={[
              { value: "ok", label: "tout est fermé" },
              { value: "pere", label: "le père oublie close(fds[1])" },
              { value: "wc", label: "wc garde son fds[1]" },
            ]}
            value={eof}
            onChange={setEof}
          />
          <Stepper steps={EOF_STEPS[eof]} interval={2200} caption="Un seul descripteur d'écriture oublié suffit : wc attend dans read pour toujours, et le père attend wc dans waitpid.">
            {(i) => <EofFig i={i} mode={eof} />}
          </Stepper>
        </div>
      </Section>

      <Section title="Le code à connaître">
        <Code
          mark={[2, 4, 5]}
          code={`// redirection : dans le fils, entre fork et execvp
int fd = open("liste.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
if (fd == -1) { perror("open"); _exit(EXIT_FAILURE); }
dup2(fd, 1);             // 1 → liste.txt
close(fd);               // la case 3 ne sert plus
execvp(argv[0], argv);   // ls garde cette table`}
        />
        <Code
          mark={[2, 4, 5, 9, 10, 13]}
          code={`int fds[2];
pipe(fds);                         // AVANT fork : fds[0] lecture, fds[1] écriture
if (fork() == 0) {                 // fils 1 : ls -l
    dup2(fds[1], 1);               // sortie → tube
    close(fds[0]); close(fds[1]);
    execvp("ls", ls_argv);         // {"ls", "-l", NULL}
}
if (fork() == 0) {                 // fils 2 : wc -l
    dup2(fds[0], 0);               // entrée ← tube
    close(fds[0]); close(fds[1]);
    execvp("wc", wc_argv);         // {"wc", "-l", NULL}
}
close(fds[0]); close(fds[1]);      // le père aussi !
/* puis waitpid sur les deux fils */`}
        />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Descripteur = indice dans la table du processus ; 0, 1, 2 = entrée, sortie, erreur standard.</li>
          <li>open renvoie le plus petit descripteur libre (−1 en cas d'échec, à tester).</li>
          <li>dup2(fd, 1) fait désigner par la case 1 le même fichier que fd ; puis close(fd).</li>
          <li>La redirection se fait dans le fils, entre fork et execvp : execvp garde la table.</li>
          <li>pipe avant fork ; chaque fils fait son dup2 puis ferme les deux extrémités.</li>
          <li>Le père ferme aussi fds[0] et fds[1] : sinon wc ne reçoit jamais la fin de fichier.</li>
        </Points>
        <Trap>
          <p>Faire la redirection dans le père. Sa propre sortie partirait dans le fichier, et l'invite du shell aussi.</p>
        </Trap>
        <Trap title="Piège du tube">
          <p>Oublier un seul close(fds[1]) (père ou wc). ls a fini, mais il reste un écrivain : wc reste bloqué dans read, et le shell dans waitpid.</p>
        </Trap>
        <Reveal question={<p>Pour <code>ls -l &gt; liste.txt</code>, que renvoie open, et que contient la table du fils juste avant execvp ?</p>}>
          <p>
            open renvoie <strong>3</strong> (0, 1, 2 sont pris). Après <code>dup2(3, 1)</code> et <code>close(3)</code> : 0 → terminal, 1 → liste.txt, 2 → terminal, 3 libre.
          </p>
        </Reveal>
        <Reveal question={<p>Pourquoi appeler pipe avant fork, et pas dans chaque fils ?</p>}>
          <p>fork copie la table des descripteurs. Appelé avant, pipe crée un seul tube dont les deux fils héritent. Dans chaque fils, on aurait deux tubes différents, sans lien entre ls et wc.</p>
        </Reveal>
        <Reveal question={<p>ls est terminé, mais wc -l n'affiche rien et le shell est figé. Cause ?</p>}>
          <p>
            Un descripteur d'écriture du tube est resté ouvert (le <code>fds[1]</code> du père ou de wc). read ne renvoie la fin de fichier que si le tube est vide <strong>et</strong> qu'aucun écrivain n'est ouvert. wc attend dans read, le père attend wc dans waitpid.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
