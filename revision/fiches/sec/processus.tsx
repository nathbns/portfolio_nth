"use client";
// Fiche CM2 Processus : fork, execvp, waitpid (exemple du cours : ls -l lancé par ensishell).
import { useState } from "react";
import { ArrowMarkers, C, Choice, Code, Figure, Idea, Points, Reveal, Section, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// 1. Anatomie d'un processus
// ---------------------------------------------------------------------------

function Anatomie() {
  const rows = [84, 102, 120, 138];
  return (
    <svg viewBox="0 0 690 262" className="w-full max-w-[690px]" role="img" aria-label="Un processus : PID, mémoire, registres, descripteurs">
      <ArrowMarkers />
      <rect x={10} y={10} width={510} height={242} fill={C.paper} stroke={C.lineStrong} />
      <text x={26} y={36} fill={C.ink} fontSize={15} fontWeight={600}>
        ensishell
      </text>
      <text x={504} y={36} textAnchor="end" fill={C.blue} fontSize={14}>
        PID 1200
      </text>

      {/* mémoire privée */}
      <text x={26} y={62} fill={C.weak} fontSize={12}>
        mémoire privée
      </text>
      <rect x={26} y={68} width={196} height={84} fill={C.fill} stroke={C.lineStrong} />
      <text x={34} y={84} fill={C.text} fontSize={12}>
        code
      </text>
      {rows.map((y, k) => (
        <text key={k} x={118} y={y} fill={C.weak} fontSize={12}>
          instr. {k + 1}
        </text>
      ))}
      <motion.rect
        x={110}
        width={104}
        height={17}
        fill={C.blue}
        fillOpacity={0.16}
        stroke={C.blue}
        animate={{ y: rows.map((y) => y - 13) }}
        transition={{ duration: 4, times: [0, 0.33, 0.66, 1], repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
      />
      {["données", "tas", "pile"].map((s, k) => (
        <g key={s}>
          <rect x={26} y={158 + k * 30} width={196} height={26} fill={C.fill} stroke={C.lineStrong} />
          <text x={34} y={176 + k * 30} fill={C.text} fontSize={12}>
            {s}
          </text>
        </g>
      ))}

      {/* registres */}
      <text x={252} y={62} fill={C.weak} fontSize={12}>
        registres
      </text>
      <rect x={252} y={68} width={110} height={26} fill="none" stroke={C.blue} strokeWidth={1.5} />
      <text x={260} y={86} fill={C.blue} fontSize={12}>
        CO
      </text>
      <motion.line
        x1={252}
        y1={81}
        x2={216}
        stroke={C.blue}
        strokeWidth={1.5}
        markerEnd="url(#arr-blue)"
        animate={{ y2: rows.map((y) => y - 5) }}
        transition={{ duration: 4, times: [0, 0.33, 0.66, 1], repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
      />
      {["r1", "r2"].map((r, k) => (
        <g key={r}>
          <rect x={252} y={102 + k * 32} width={110} height={26} fill={C.fill} stroke={C.lineStrong} />
          <text x={260} y={120 + k * 32} fill={C.weak} fontSize={12}>
            {r}
          </text>
        </g>
      ))}

      {/* descripteurs */}
      <text x={392} y={62} fill={C.weak} fontSize={12}>
        descripteurs
      </text>
      {["entrée", "sortie", "erreur"].map((r, k) => (
        <g key={r}>
          <rect x={392} y={68 + k * 32} width={28} height={26} fill={C.fill} stroke={C.lineStrong} />
          <text x={406} y={86 + k * 32} textAnchor="middle" fill={C.ink} fontSize={13}>
            {k}
          </text>
          <text x={428} y={86 + k * 32} fill={C.text} fontSize={12}>
            {r}
          </text>
          <line x1={484} y1={81 + k * 32} x2={566} y2={104 + k * 10} stroke={C.weak} strokeWidth={1.2} markerEnd="url(#arr-weak)" />
        </g>
      ))}
      <rect x={570} y={92} width={110} height={44} fill={C.fill} stroke={C.lineStrong} />
      <text x={625} y={119} textAnchor="middle" fill={C.ink} fontSize={13}>
        terminal
      </text>
      <text x={252} y={238} fill={C.weak} fontSize={12}>
        PID 1200 : valeur d'illustration
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. fork, execvp, waitpid pas à pas
// ---------------------------------------------------------------------------

const CODE = [
  "pid_t pid = fork();",
  "if (pid == -1) {",
  '    perror("fork");',
  "} else if (pid == 0) {",
  "    execvp(argv[0], argv);",
  '    perror("execvp");',
  "    _exit(EXIT_FAILURE);",
  "} else {",
  "    waitpid(pid, &status, 0);",
  "}",
];
const LY = (k: number) => 36 + k * 25; // ligne de base de la ligne k (0 = ligne 1)

const LS_OUT = [
  "-rw-r--r-- 1 eleve eleve  812 readcmd.c",
  "-rw-r--r-- 1 eleve eleve 2310 ensishell.c",
  "-rwxr-xr-x 1 eleve eleve 9120 ensishell",
];

const STEPS = [
  "Le shell (PID 1200) arrive sur fork()",
  "fork copie le processus : mémoire, descripteurs, position dans le code",
  "Seule la valeur de retour diffère : 1201 dans le père, 0 dans le fils",
  "Le père va au else (l. 9), le fils à pid == 0 (l. 5)",
  "execvp : le fils devient ls, garde son PID 1201 et ses descripteurs",
  "waitpid bloque le père ; ls écrit sa liste sur le descripteur 1",
  "ls se termine (code 0) : waitpid revient, WEXITSTATUS(status) = 0",
];

function Pointer({ line, keyframes, color, dx, visible }: { line: number; keyframes?: number[]; color: string; dx: number; visible: boolean }) {
  const target = keyframes ? keyframes.map((k) => LY(k) - 5) : LY(line) - 5;
  return (
    <motion.g
      initial={false}
      animate={{ y: target, opacity: visible ? 1 : 0 }}
      transition={{ duration: keyframes ? 1.4 : 0.4, ease: "easeInOut" }}
    >
      <polygon points={`${dx},-6 ${dx + 10},0 ${dx},6`} fill={color} />
    </motion.g>
  );
}

function ProcBox({
  y,
  title,
  pid,
  role,
  replaced,
  status,
  ret,
  progress,
  dim,
}: {
  y: number;
  title: string;
  pid: string;
  role: string;
  replaced: boolean;
  status?: string;
  ret?: string;
  progress?: boolean;
  dim?: boolean;
}) {
  const mem = ["code", "données", "tas", "pile"];
  return (
    <motion.g initial={false} animate={{ opacity: dim ? 0.6 : 1 }} transition={{ duration: 0.4 }}>
      <rect x={350} y={y} width={420} height={118} fill={C.paper} stroke={role === "père" ? C.blue : C.orange} strokeWidth={1.5} />
      <motion.text key={title} x={366} y={y + 24} fill={C.ink} fontSize={15} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {title}
      </motion.text>
      <text x={754} y={y + 24} textAnchor="end" fill={role === "père" ? C.blue : C.orange} fontSize={13}>
        {pid} · {role}
      </text>
      {mem.map((m, k) => (
        <g key={m}>
          <motion.rect
            x={366 + k * 70}
            y={y + 36}
            width={64}
            height={24}
            initial={false}
            animate={{ fillOpacity: replaced ? 0.22 : 1 }}
            fill={replaced ? C.orange : C.fill}
            stroke={replaced ? C.orange : C.lineStrong}
          />
          <text x={398 + k * 70} y={y + 53} textAnchor="middle" fill={C.text} fontSize={12}>
            {m}
          </text>
        </g>
      ))}
      {[0, 1, 2].map((d) => (
        <g key={d}>
          <rect x={366 + d * 30} y={y + 72} width={26} height={24} fill={C.fill} stroke={replaced ? C.green : C.lineStrong} strokeWidth={replaced ? 1.5 : 1} />
          <text x={379 + d * 30} y={y + 89} textAnchor="middle" fill={C.ink} fontSize={13}>
            {d}
          </text>
        </g>
      ))}
      <text x={460} y={y + 89} fill={C.weak} fontSize={12}>
        → terminal
      </text>
      {replaced && (
        <motion.text x={754} y={y + 53} textAnchor="end" fill={C.orange} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          ← ls
        </motion.text>
      )}
      {status && (
        <motion.text key={status} x={754} y={y + 89} textAnchor="end" fill={C.ink} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {status}
        </motion.text>
      )}
      {ret && (
        <motion.text key={ret} x={754} y={y + 53} textAnchor="end" fill={role === "père" ? C.blue : C.orange} fontSize={13} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          {ret}
        </motion.text>
      )}
      {progress && (
        <>
          <rect x={366} y={y + 104} width={388} height={6} fill={C.fill2} />
          <motion.rect x={366} y={y + 104} height={6} fill={C.orange} initial={{ width: 0 }} animate={{ width: 388 }} transition={{ duration: 1.6 }} />
        </>
      )}
    </motion.g>
  );
}

function ForkExecWait({ i }: { i: number }) {
  const pereLine = i >= 3 ? 8 : 0;
  const filsLine = i >= 3 ? 4 : 0;
  return (
    <svg viewBox="0 0 780 380" className="w-full max-w-[780px]" role="img" aria-label="fork, execvp et waitpid pas à pas">
      {/* code */}
      <rect x={6} y={14} width={322} height={258} fill={C.paper} stroke={C.line} />
      {CODE.map((l, k) => {
        const indent = l.length - l.trimStart().length;
        const hotP = k === pereLine && i !== 6;
        const hotF = k === filsLine && i >= 1 && i <= 5;
        return (
          <g key={k}>
            {(hotP || hotF) && (
              <rect x={42} y={LY(k) - 16} width={282} height={22} fill={hotF && !hotP ? C.orange : C.blue} fillOpacity={0.12} />
            )}
            <text x={62} y={LY(k)} textAnchor="end" fill={C.faint} fontSize={12}>
              {k + 1}
            </text>
            <text x={72 + indent * 7.8} y={LY(k)} fill={C.text} fontSize={13}>
              {l.trimStart()}
            </text>
          </g>
        );
      })}
      <Pointer line={pereLine} keyframes={i === 3 ? [0, 1, 7, 8] : undefined} color={C.blue} dx={12} visible={i !== 6} />
      <Pointer line={filsLine} keyframes={i === 3 ? [0, 1, 3, 4] : undefined} color={C.orange} dx={26} visible={i >= 1 && i <= 5} />

      {/* terminal */}
      <rect x={6} y={286} width={322} height={88} fill={C.fill} stroke={C.lineStrong} />
      <text x={14} y={303} fill={C.ink} fontSize={12}>
        ensishell&gt; ls -l
      </text>
      {i >= 5 &&
        LS_OUT.map((l, k) => (
          <motion.text
            key={l}
            x={14}
            y={319 + k * 15}
            fill={C.text}
            fontSize={12}
            style={{ whiteSpace: "pre" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + k * 0.35 }}
          >
            {l}
          </motion.text>
        ))}
      {i >= 6 && (
        <motion.text x={14} y={367} fill={C.ink} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          ensishell&gt; ▍
        </motion.text>
      )}

      {/* processus */}
      <ProcBox
        y={14}
        title="ensishell"
        pid="PID 1200"
        role="père"
        replaced={false}
        ret={i >= 2 && i <= 4 ? "fork() → 1201" : undefined}
        status={i === 5 ? "⏸ bloqué dans waitpid" : i === 6 ? "WEXITSTATUS = 0" : undefined}
        dim={i === 5}
      />
      {i >= 1 && (
        <motion.g initial={{ opacity: 0, y: -150 }} animate={{ opacity: i === 6 ? 0.3 : 1, y: 0 }} transition={{ duration: 0.7 }}>
          <ProcBox
            y={176}
            title={i >= 4 ? "ls" : "ensishell"}
            pid="PID 1201"
            role="fils"
            replaced={i >= 4}
            ret={i >= 2 && i <= 3 ? "fork() → 0" : undefined}
            status={i >= 4 && i <= 5 ? "0 1 2 gardés" : i === 6 ? "terminé, code 0" : undefined}
            progress={i === 5}
          />
        </motion.g>
      )}
      {i >= 2 && i <= 3 && (
        <motion.text x={560} y={160} textAnchor="middle" fill={C.weak} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          même code, même mémoire copiée, mêmes descripteurs
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Tâche de fond et zombie
// ---------------------------------------------------------------------------

type Mode = "fg" | "bg";

function Seg({ x, w, y, color, label, dashed, delay }: { x: number; w: number; y: number; color: string; label: string; dashed?: boolean; delay: number }) {
  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        height={26}
        fill={color}
        fillOpacity={dashed ? 0.08 : 0.2}
        stroke={color}
        strokeDasharray={dashed ? "5 4" : undefined}
        initial={{ width: 0 }}
        animate={{ width: w }}
        transition={{ duration: 0.6, delay }}
      />
      <motion.text x={x + 8} y={y + 18} fill={C.ink} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.3 }}>
        {label}
      </motion.text>
    </g>
  );
}

function Timeline({ mode }: { mode: Mode }) {
  return (
    <svg key={mode} viewBox="0 0 680 190" className="w-full max-w-[680px]" role="img" aria-label="Chronologie du père et du fils">
      <ArrowMarkers />
      <line x1={110} y1={170} x2={670} y2={170} stroke={C.line} markerEnd="url(#arr-line)" />
      <text x={670} y={186} textAnchor="end" fill={C.faint} fontSize={12}>
        temps
      </text>
      <text x={10} y={58} fill={C.blue} fontSize={13}>
        père (shell)
      </text>
      <text x={10} y={128} fill={C.orange} fontSize={13}>
        fils
      </text>
      <line x1={140} y1={40} x2={140} y2={160} stroke={C.weak} strokeDasharray="3 3" />
      <text x={140} y={30} textAnchor="middle" fill={C.weak} fontSize={12}>
        fork
      </text>
      {mode === "fg" ? (
        <>
          <Seg x={140} w={300} y={40} color={C.weak} label="waitpid : bloqué" dashed delay={0.1} />
          <Seg x={440} w={220} y={40} color={C.blue} label="nouvelle invite" delay={0.9} />
          <Seg x={140} w={300} y={110} color={C.orange} label="ls -l s'exécute" delay={0.1} />
          <motion.text x={448} y={128} fill={C.green} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            fin (code 0) : récupéré
          </motion.text>
        </>
      ) : (
        <>
          <Seg x={140} w={520} y={40} color={C.blue} label="invite tout de suite, commande suivante…" delay={0.1} />
          <Seg x={140} w={170} y={110} color={C.orange} label="sleep 1" delay={0.1} />
          <Seg x={310} w={260} y={110} color={C.red} label="zombie : Z [sleep] <defunct>" dashed delay={0.8} />
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
            <line x1={570} y1={40} x2={570} y2={160} stroke={C.green} strokeDasharray="3 3" />
            <text x={576} y={156} fill={C.green} fontSize={12}>
              waitpid
            </text>
          </motion.g>
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4. fork dans une boucle
// ---------------------------------------------------------------------------

const NODES = [
  { id: 0, x: 320, y: 48, round: -1, parent: -1 },
  { id: 1, x: 150, y: 128, round: 0, parent: 0 },
  { id: 2, x: 360, y: 128, round: 1, parent: 0 },
  { id: 3, x: 90, y: 208, round: 1, parent: 1 },
  { id: 4, x: 540, y: 128, round: 2, parent: 0 },
  { id: 5, x: 210, y: 208, round: 2, parent: 1 },
  { id: 6, x: 360, y: 208, round: 2, parent: 2 },
  { id: 7, x: 90, y: 288, round: 2, parent: 3 },
];

function ForkTree({ s }: { s: number }) {
  const count = 2 ** s;
  return (
    <svg viewBox="0 0 680 320" className="w-full max-w-[680px]" role="img" aria-label="Arbre des processus créés par fork dans une boucle">
      <text x={10} y={24} fill={C.ink} fontSize={13}>
        for (i = 0; i &lt; 3; i++) fork();
      </text>
      {NODES.filter((n) => n.parent >= 0 && n.round < s).map((n) => {
        const p = NODES[n.parent];
        return (
          <g key={`e${n.id}`}>
            <motion.line
              x1={p.x}
              y1={p.y}
              x2={n.x}
              y2={n.y}
              stroke={n.round === s - 1 ? C.orange : C.lineStrong}
              strokeWidth={1.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.text
              x={(p.x + n.x) / 2 + (n.x < p.x ? -10 : 10)}
              y={(p.y + n.y) / 2 - 4}
              textAnchor={n.x < p.x ? "end" : "start"}
              fill={C.weak}
              fontSize={12}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              i={n.round}
            </motion.text>
          </g>
        );
      })}
      {NODES.filter((n) => n.round < s).map((n) => {
        const fresh = n.round >= 0 && n.round === s - 1;
        return (
          <motion.g key={`n${n.id}`} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: n.round < 0 ? 0 : 0.35 }}>
            <circle cx={n.x} cy={n.y} r={19} fill={C.paper} stroke={fresh ? C.orange : C.blue} strokeWidth={2} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" fill={C.ink} fontSize={13}>
              P{n.id}
            </text>
          </motion.g>
        );
      })}
      <text x={670} y={250} textAnchor="end" fill={C.weak} fontSize={12}>
        processus
      </text>
      <motion.text key={count} x={670} y={290} textAnchor="end" fill={C.ink} fontSize={34} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {count}
      </motion.text>
      <text x={670} y={310} textAnchor="end" fill={C.weak} fontSize={12}>
        = 2^{s}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Processus() {
  const [mode, setMode] = useState<Mode>("fg");
  return (
    <>
      <Section title="L'idée">
        <Idea>Pour lancer ls -l, le shell fait trois appels : fork crée une copie de lui-même, execvp remplace le programme de la copie par ls, waitpid attend la fin de ls.</Idea>
        <p>
          Le shell ne contient pas le code de <code>ls</code>. Il découpe la ligne en <code>argv = {"{"}"ls", "-l", NULL{"}"}</code>. Puis il lance un autre programme et attend sa fin.
        </p>
      </Section>

      <Section title="Un processus, c'est quoi ?">
        <p>
          Un processus est un <strong>programme en exécution</strong>. Il a quatre éléments à retenir.
        </p>
        <Figure caption="PID, mémoire privée (invisible des autres processus), registres dont le compteur ordinal (CO = prochaine instruction), table des descripteurs. fork les copie ; execvp en remplace une partie.">
          <Anatomie />
        </Figure>
      </Section>

      <Section title="fork, execvp, waitpid pas à pas">
        <Stepper steps={STEPS} interval={2600} caption="Flèche bleue : où en est le père. Flèche orange : où en est le fils. PID 1200 et 1201 : valeurs d'illustration.">
          {(i) => <ForkExecWait i={i} />}
        </Stepper>
        <table className="ftable">
          <thead>
            <tr>
              <th>Appel</th>
              <th>Ce qu'il fait</th>
              <th>Ce qu'il renvoie</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>fork()</code>
              </td>
              <td>duplique le processus appelant ; les deux continuent après fork</td>
              <td>PID du fils dans le père, 0 dans le fils, −1 si échec</td>
            </tr>
            <tr>
              <td>
                <code>execvp(argv[0], argv)</code>
              </td>
              <td>remplace le programme du processus courant ; garde le PID et les descripteurs</td>
              <td>ne revient jamais s'il réussit</td>
            </tr>
            <tr>
              <td>
                <code>waitpid(pid, &amp;status, 0)</code>
              </td>
              <td>bloque le père jusqu'à la fin de ce fils</td>
              <td>
                <code>WIFEXITED(status)</code> : fin normale ; <code>WEXITSTATUS(status)</code> : code de sortie
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Tâche de fond et zombie">
        <p>Sans waitpid, un fils terminé devient un <strong>zombie</strong>. Il ne s'exécute plus, mais son entrée reste dans la table des processus.</p>
        <Figure caption="Avec & le shell n'attend pas. Le fils fini reste zombie (état Z dans ps -o pid,ppid,stat,cmd) jusqu'à ce qu'un waitpid le récupère.">
          <div className="space-y-4">
            <Choice
              label="Commande"
              options={[
                { value: "fg", label: "ls -l" },
                { value: "bg", label: "sleep 1 &" },
              ]}
              value={mode}
              onChange={setMode}
            />
            <Timeline mode={mode} />
          </div>
        </Figure>
      </Section>

      <Section title="Le piège : fork dans une boucle">
        <p>Le fils continue la même boucle que son père. À chaque tour, chaque processus existant appelle fork.</p>
        <Stepper
          steps={["Avant la boucle : 1 processus", "Tour i = 0 : P0 appelle fork → 2", "Tour i = 1 : les 2 appellent fork → 4", "Tour i = 2 : les 4 appellent fork → 8"]}
          caption="En orange, les processus créés au tour courant. n tours donnent 2^n processus au total."
        >
          {(s) => <ForkTree s={s} />}
        </Stepper>
      </Section>

      <Section title="Le code à connaître">
        <Code
          mark={[5, 6, 7, 9]}
          code={`pid_t pid = fork();
if (pid == -1) {
    perror("fork");                // échec : aucun fils créé
} else if (pid == 0) {             // le fils
    execvp(argv[0], argv);         // ne revient pas s'il réussit
    perror("execvp");              // seulement en cas d'échec
    _exit(EXIT_FAILURE);           // sinon le fils continue le code du shell
} else {                           // le père (pid = PID du fils)
    waitpid(pid, &status, 0);      // bloqué jusqu'à la fin du fils
}`}
        />
        <p>
          Avec <code>&amp;</code> (TP Ensishell), le père n'appelle pas waitpid tout de suite. Il ramasse les zombies plus tard, sans bloquer :
        </p>
        <Code code={`while (waitpid(-1, NULL, WNOHANG) > 0)
    ;   // -1 : n'importe quel fils ; WNOHANG : ne pas bloquer`} />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Processus = programme en exécution : PID, mémoire privée (code, données, tas, pile), registres, table des descripteurs (0 entrée, 1 sortie, 2 erreur).</li>
          <li>
            <code>fork</code> duplique : seule la valeur de retour diffère (PID du fils / 0 / −1).
          </li>
          <li>
            <code>execvp</code> change de programme, pas de processus : même PID, mêmes descripteurs.
          </li>
          <li>La ligne après execvp ne s'exécute qu'en cas d'échec : perror, puis _exit.</li>
          <li>
            <code>waitpid</code> bloque le père, lit le code de sortie et évite le zombie.
          </li>
          <li>n tours de fork dans une boucle : 2^n processus.</li>
        </Points>
        <Trap>
          <p>
            Oublier <code>_exit</code> après execvp. Si la commande n'existe pas, le fils continue le code du shell : deux shells lisent le même terminal (vu au TP Ensishell).
          </p>
        </Trap>
        <Reveal question={<p>Combien de processus existent après <code>for (i = 0; i &lt; 3; i++) fork();</code> ?</p>}>
          <p>
            <strong>8 = 2³.</strong> Chaque tour double le nombre de processus : 1 → 2 → 4 → 8. Le fils continue la boucle comme son père.
          </p>
        </Reveal>
        <Reveal question={<p>Après un execvp réussi, que garde le fils ? Que perd-il ?</p>}>
          <p>
            Il garde son <strong>PID</strong> (1201) et sa <strong>table des descripteurs</strong> (0, 1, 2 vers le terminal). Son code, ses données, son tas et sa pile sont remplacés par ceux de ls, qui repart à son main.
          </p>
        </Reveal>
        <Reveal question={<p>L'utilisateur tape une commande qui n'existe pas (<code>lsx</code>). Que se passe-t-il ?</p>}>
          <p>
            execvp échoue et <strong>revient</strong>. perror affiche <code>execvp: No such file or directory</code>, puis <code>_exit(EXIT_FAILURE)</code> termine le fils. Le père sort de waitpid.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
