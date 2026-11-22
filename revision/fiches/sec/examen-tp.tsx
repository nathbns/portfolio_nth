"use client";
// Fiche « examen de TP » : motifs à écrire de mémoire, commandes, bugs reconnus à leur symptôme.
// Sources : READMEs des TP2 à TP5, sec/synchro_aide_memoire.md, vidéos des TP.
import { useState } from "react";
import { C, Choice, Code, Figure, Idea, Note, Points, Reveal, Section, Stepper, Tag, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// 1. Commandes
// ---------------------------------------------------------------------------

const COMMANDES = `./tp.sh                          # shell Linux (Docker, GCC 15, man, gdb) dans le dossier du TP
docker run --rm -it -v "$PWD":/tp tp-sec bash   # la même chose, à la main

gcc -Wall -O2 mesure.c module.c -o prog   # C23 par défaut : nullptr, constexpr
make                             # TP3 : toutes les versions (make clean)
make CFLAGS="-Wall -Wextra -g -fanalyzer" # + analyse statique

time ./prog                      # real = écoulé ; user, sys = CPU, tous cœurs
time timeout 10 ./v2             # pour ce qui ne s'arrête jamais
top                              # 0 % = bloqué ; 100 % = tourne (peut-être pour rien)
ps -o pid,ppid,stat,cmd          # STAT = Z : zombie

man -l sujet.1    info -f ./sujet.info    # l'énoncé et les indications
man sem_init      info libc "ISO C Threads"

cmake -B build && cd build && make && make check   # Ensishell`;

// ---------------------------------------------------------------------------
// 2. Diagnostic : symptôme → classe de bug
// ---------------------------------------------------------------------------

type SymId = "fige" | "tourne" | "famine" | "assert" | "deborde" | "segv" | "faux" | "lent";

interface Sym {
  id: SymId;
  label: string;
  cpu?: number[];
  term?: string[];
  classe: string;
  color: string;
  causes: string[];
  reflexe: string;
}

const SYMS: Sym[] = [
  {
    id: "fige",
    label: "figé, 0 % CPU",
    cpu: [0, 0, 0, 0],
    classe: "Interblocage ou réveil perdu (les threads dorment)",
    color: C.red,
    causes: [
      "1 seule condition pour deux types de threads + cnd_signal (TP5)",
      "cnd_wait sur une autre condition que celle du réveil (TP4, bug 2)",
      "mauvais sémaphore dans sem_post (TP5)",
      "dormir sur un sémaphore en tenant le mutex commun",
      "compteur d'attente jamais initialisé (TP4, bug 1)",
    ],
    reflexe: "Pour chaque cnd_wait : qui envoie le réveil, et sur quelle condition ?",
  },
  {
    id: "tourne",
    label: "ne finit jamais, 100 %",
    cpu: [100, 100, 0, 0],
    classe: "Attente active qui ne sort pas : interblocage, ou interblocage actif (livelock)",
    color: C.orange,
    causes: ["TP3 V2 : prendre avant d'attendre (il s'attend lui-même)", "TP3 V4 : deux drapeaux levés, chacun attend l'autre", "TP3 V5, V6 : les deux cèdent sans fin"],
    reflexe: "user ≈ 2 × real dans time : deux cœurs tournent pour rien.",
  },
  {
    id: "famine",
    label: "un thread n'avance jamais",
    cpu: [100, 100, 100, 100],
    classe: "Famine : un thread attend pour toujours, les autres avancent",
    color: C.yellow,
    causes: ["pthread_rwlock par défaut : priorité aux lecteurs, 0 écriture en 20 s (TP4)", "TP3 V3 avec un seul thread : alternance stricte"],
    reflexe: "Donner la priorité à celui qui attend (PREFER_WRITER_NONRECURSIVE_NP, nb_ecrivain_attente > 0).",
  },
  {
    id: "assert",
    label: "Assertion failed",
    term: ["$ ./v1", "Assertion `a == b' failed.", "Aborted"],
    classe: "Exclusion mutuelle violée (sûreté)",
    color: C.red,
    causes: ["aucune protection, ou atomic par variable (TP3 V0)", "tester puis prendre en deux étapes (TP3 V1)", "bool au lieu de atomic_bool pour les drapeaux", "Peterson écrit avec dernier != me"],
    reflexe: "Le groupe d'opérations doit être dans une seule section critique.",
  },
  {
    id: "deborde",
    label: "nbmessage > n",
    term: ["tampon plein, n = 3", "P2 réveillé écrit sans retester :", "nbmessage = 4 > n", "le message 2 est écrasé"],
    classe: "Condition non revérifiée",
    color: C.purple,
    causes: ["if au lieu de while autour de cnd_wait (testé : déborde à chaque exécution)"],
    reflexe: "Toujours while (condition) cnd_wait(…).",
  },
  {
    id: "segv",
    label: "Segmentation fault",
    term: ["$ ./perf", "Segmentation fault"],
    classe: "Accès hors du tableau",
    color: C.cyan,
    causes: ["oubli du % n sur i_write ou i_read", "i_write = msg au lieu d'avancer l'indice"],
    reflexe: "i = (i + 1) % n après chaque accès.",
  },
  {
    id: "faux",
    label: "finit, mais faux",
    term: ["add 1, 2, 3 puis 3 pop", "→ 1, 1, 1   (attendu 1, 2, 3)"],
    classe: "Erreur silencieuse ou accès non protégé",
    color: C.blue,
    causes: ["i_read jamais avancé : pop relit la même case", "modifier i_write sans tenir le mutex", "champ oublié dans init : malloc ne met pas à zéro"],
    reflexe: "Le squelette ne vérifie pas les messages : écrire un petit test FIFO.",
  },
  {
    id: "lent",
    label: "lent, mais finit",
    term: ["$ time ./perf_sem", "real 46 s   (16 s attendu)"],
    classe: "Pas forcément un bug : regarder top et sys",
    color: C.green,
    causes: ["sem_wait après mtx_lock : un producteur dort avec le mutex (46 s au lieu de 16 s)", "broadcast réveille tout le monde : beaucoup de sys", "TP3 V6 : celui qui cède relève son drapeau tout de suite"],
    reflexe: "Lent ≠ bloqué. Un interblocage, c'est 0 % de CPU.",
  },
];

function SymptomPanel({ s }: { s: Sym }) {
  return (
    <svg viewBox="0 0 330 200" className="w-full max-w-[330px]" role="img" aria-label={`Symptôme : ${s.label}`}>
      <rect x={1} y={1} width={328} height={198} fill={C.fill} stroke={C.lineStrong} />
      {s.cpu ? (
        <>
          <text x={14} y={24} fill={C.weak} fontSize={12}>
            $ top
          </text>
          {s.cpu.map((v, k) => (
            <g key={k}>
              <rect x={30 + k * 72} y={44} width={44} height={110} fill={C.paper} stroke={C.line} />
              <motion.rect
                x={30 + k * 72}
                width={44}
                fill={v > 0 ? s.color : C.faint}
                fillOpacity={0.55}
                initial={{ y: 154, height: 0 }}
                animate={{ y: 154 - (v / 100) * 110, height: (v / 100) * 110 }}
                transition={{ duration: 0.8, delay: k * 0.08 }}
              />
              <text x={52 + k * 72} y={172} textAnchor="middle" fill={C.weak} fontSize={12}>
                cœur {k}
              </text>
              <text x={52 + k * 72} y={190} textAnchor="middle" fill={C.ink} fontSize={13}>
                {v} %
              </text>
            </g>
          ))}
        </>
      ) : (
        (s.term ?? []).map((l, k) => (
          <motion.text key={l} x={14} y={30 + k * 22} fill={k === 0 ? C.weak : C.ink} fontSize={13} style={{ whiteSpace: "pre" }} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.3 }}>
            {l}
          </motion.text>
        ))
      )}
    </svg>
  );
}

function Diagnostic() {
  const [id, setId] = useState<SymId>("fige");
  const s = SYMS.find((x) => x.id === id) ?? SYMS[0];
  return (
    <Figure caption="Choisir ce qu'on observe : la classe du bug, ses causes vues en TP, et le réflexe à avoir.">
      <div className="space-y-4">
        <Choice label="On observe" options={SYMS.map((x) => ({ value: x.id, label: x.label }))} value={id} onChange={setId} />
        <div className="flex flex-wrap items-start gap-5">
          <div className="w-full max-w-[330px]">
            <SymptomPanel key={s.id} s={s} />
          </div>
          <motion.div key={s.id} className="min-w-[260px] flex-1 space-y-2 text-[15px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <p className="font-mono text-[14px]" style={{ color: s.color }}>
              {s.classe}
            </p>
            <ul className="flist">
              {s.causes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="text-fg-weak">→ {s.reflexe}</p>
          </motion.div>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Les motifs à écrire de mémoire
// ---------------------------------------------------------------------------

type PatId = "fork" | "tube" | "moniteur" | "sem" | "rw" | "drapeaux" | "verrous" | "threads";

const PATTERNS: { id: PatId; label: string; note: string; code: string; mark?: number[] }[] = [
  {
    id: "fork",
    label: "fork / exec / wait",
    note: "TP Ensishell. Le fils qui rate execvp doit mourir, sinon deux shells lisent le même terminal.",
    mark: [6, 10, 11, 14],
    code: `char **cmd = l->seq[0];       // {"ls", "-l", NULL}
if (cmd == NULL) continue;    // ligne vide : rien à lancer

pid_t pid = fork();
if (pid == -1) {
  perror("fork");
} else if (pid == 0) {        // le fils
  execvp(cmd[0], cmd);        // ne revient pas si ça marche
  perror(cmd[0]);             // "toto: No such file or directory"
  exit(1);                    // le fils meurt, sinon 2 shells
} else if (!l->bg) {          // le père ; avec & : on n'attend pas
  int status;
  waitpid(pid, &status, 0);   // WEXITSTATUS(status) = code de sortie
}
// au début du while, avant readline : ramasser les zombies
while (waitpid(-1, NULL, WNOHANG) > 0)
  ;`,
  },
  {
    id: "tube",
    label: "redirection / tube",
    note: "CM Fichiers. Tout se fait dans le fils, entre fork et execvp. pipe avant fork, et tout le monde ferme les deux extrémités.",
    mark: [3, 7, 10, 15],
    code: `// ls -l > liste.txt, dans le fils :
int fd = open("liste.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
dup2(fd, 1);  close(fd);  execvp(argv[0], argv);

// ls -l | wc -l :
int fds[2];
pipe(fds);                              // AVANT fork
if (fork() == 0) {                      // ls
  dup2(fds[1], 1); close(fds[0]); close(fds[1]);
  execvp("ls", ls_argv);
}
if (fork() == 0) {                      // wc
  dup2(fds[0], 0); close(fds[0]); close(fds[1]);
  execvp("wc", wc_argv);
}
close(fds[0]); close(fds[1]);           // le père aussi !`,
  },
  {
    id: "moniteur",
    label: "moniteur",
    note: "TP Channel, version 1 : un mutex, une condition (donc broadcast), compteurs de bloqués. pop est le miroir.",
    mark: [2, 4, 5, 13],
    code: `void addChannel_moniteur(channel_moniteur_t *c, unsigned int msg) {
  mtx_lock(&c->mutex);
  c->nb_block_write++;
  while (c->n == c->nbmessage)          // plein : on attend
    cnd_wait(&c->cond, &c->mutex);
  c->nb_block_write--;
  c->tab[c->i_write] = msg;
  c->i_write++;
  c->i_write = c->i_write % c->n;
  c->nbmessage++;
  if (c->nb_block_read > 0)
    cnd_broadcast(&c->cond);            // 1 condition pour 2 types
  mtx_unlock(&c->mutex);
}
// pop : copier tab[i_read] dans une variable AVANT le unlock`,
  },
  {
    id: "sem",
    label: "sémaphores",
    note: "TP Channel, version 2 : 2 sémaphores + 2 mutex. Chaque fonction prend dans un sémaphore et rend dans l'autre.",
    mark: [5, 6, 9],
    code: `sem_init(&c->case_libres, 0, N);     // tampon vide au départ
sem_init(&c->case_occupees, 0, 0);   // 0 = partagé entre threads

void addChannel_sem(channel_sem_t *c, unsigned int msg) {
  sem_wait(&c->case_libres);         // AVANT le lock : dort si plein
  mtx_lock(&c->mutex_write);
  c->tab[c->i_write] = msg;
  c->i_write = (c->i_write + 1) % c->n;
  mtx_unlock(&c->mutex_write);
  sem_post(&c->case_occupees);       // APRÈS l'écriture
}
// pop : sem_wait(case_occupees), mutex_read, lire, sem_post(case_libres)`,
  },
  {
    id: "rw",
    label: "lecteurs-rédacteurs",
    note: "TP RWMutex : une condition par type de thread, priorité aux rédacteurs.",
    mark: [4, 14],
    code: `void rwmutex_rdlock(rwmutex_t *l) {
  mtx_lock(&l->mutex);
  l->nb_lecteur_attente++;
  while (l->ecrivain_actif || l->nb_ecrivain_attente > 0)  // priorité rédacteurs
    cnd_wait(&l->cnd_lecteurs, &l->mutex);
  l->nb_lecteur_attente--;
  l->nb_lecteur_actif++;
  mtx_unlock(&l->mutex);
}
void rwmutex_wrlock(rwmutex_t *l) {
  mtx_lock(&l->mutex);
  l->nb_ecrivain_attente++;
  while (l->ecrivain_actif || l->nb_lecteur_actif > 0)
    cnd_wait(&l->cnd_ecrivains, &l->mutex);   // PAS cnd_lecteurs
  l->nb_ecrivain_attente--;
  l->ecrivain_actif = true;
  mtx_unlock(&l->mutex);
}
// rdunlock : dernier lecteur et un rédacteur attend → cnd_signal(&cnd_ecrivains)
// wrunlock : un rédacteur attend → signal(cnd_ecrivains) ; sinon broadcast(cnd_lecteurs)`,
  },
  {
    id: "drapeaux",
    label: "Peterson / Dekker",
    note: "TP Comprendre la concurrence. atomic_bool obligatoire : avec bool, le processeur réordonne et deux threads entrent.",
    mark: [1, 6],
    code: `static atomic_bool demande_et_occupation[2] = {};
static atomic_int dernier = 0;

void debutSectionCritique(int me) {       // Peterson
  demande_et_occupation[me] = true;       // je veux entrer
  dernier = me;                           // je suis arrivé en dernier
alpha:
  if (demande_et_occupation[1 - me] && dernier == me)
    goto alpha;                           // l'autre veut ET je suis le dernier
}
void finSectionCritique(int me) { demande_et_occupation[me] = false; }`,
  },
  {
    id: "verrous",
    label: "mutex, spinlock, rwlock",
    note: "init avant les thrd_create, destroy après les thrd_join. _np = extension glibc, non portable.",
    mark: [9],
    code: `static mtx_t m;              mtx_init(&m, mtx_plain);
mtx_lock(&m);  /* … */       mtx_unlock(&m);       mtx_destroy(&m);

static pthread_spinlock_t s; pthread_spin_init(&s, PTHREAD_PROCESS_PRIVATE);
pthread_spin_lock(&s); /* … */ pthread_spin_unlock(&s); pthread_spin_destroy(&s);

pthread_rwlockattr_t attr;
pthread_rwlockattr_init(&attr);
pthread_rwlockattr_setkind_np(&attr, PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP);
pthread_rwlock_init(&l, &attr);      // nullptr : priorité aux lecteurs
pthread_rwlockattr_destroy(&attr);
pthread_rwlock_rdlock(&l); / pthread_rwlock_wrlock(&l);  pthread_rwlock_unlock(&l);`,
  },
  {
    id: "threads",
    label: "threads et main",
    note: "thrd_create prend l'adresse (il remplit t), thrd_join la valeur. Tout créer, puis tout attendre, puis détruire.",
    mark: [4, 6, 8],
    code: `int f(void *arg) { int me = (long int)arg; /* … */ return 0; }

thrd_t t[N];
for (long i = 0; i < N; i++)
  thrd_create(&t[i], f, (void *)i);   // 1. tout créer
for (int i = 0; i < N; i++)
  thrd_join(t[i], nullptr);           // 2. tout attendre
mtx_destroy(&m);                      // 3. détruire, puis les assert
assert(a == 2 * NB);`,
  },
];

function Motifs() {
  const [id, setId] = useState<PatId>("moniteur");
  const p = PATTERNS.find((x) => x.id === id) ?? PATTERNS[0];
  return (
    <div className="space-y-3">
      <Choice options={PATTERNS.map((x) => ({ value: x.id, label: x.label }))} value={id} onChange={setId} />
      <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-3">
        <p className="text-[15px] text-fg-weak">{p.note}</p>
        <Code code={p.code} mark={p.mark} />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Le moniteur, ligne par ligne
// ---------------------------------------------------------------------------

const MON_CODE = `mtx_lock(&m);                       // au début de TOUTES les fonctions
nb_attente++;
while (!je_peux_continuer)          // while, jamais if
    cnd_wait(&ma_file, &m);
nb_attente--;
/* modifier l'état */
if (nb_attente_autre_cote > 0)
    cnd_signal(&file_autre_cote);   // ou broadcast
mtx_unlock(&m);                     // à la fin de TOUTES les fonctions`;

const MON_STEPS: { label: string; mark: number[]; why: string }[] = [
  { label: "1. Prendre le mutex", mark: [1], why: "Un seul mutex protège tout l'état. Toutes les fonctions commencent par mtx_lock." },
  { label: "2. S'inscrire comme bloqué possible", mark: [2, 5], why: "++ avant le while, -- après : exactement une fois chacun. En unsigned, 0 − 1 donne 4294967295." },
  { label: "3. Attendre dans un while", mark: [3], why: "Être réveillé ne donne pas la main : un autre thread a pu passer avant et rendre le test de nouveau vrai. On reteste." },
  { label: "4. cnd_wait sur la bonne file", mark: [4], why: "Relâche le mutex et dort d'un seul coup ; au réveil, reprend le mutex. Attendre sur la condition où les autres envoient le réveil." },
  { label: "5. Modifier l'état", mark: [6], why: "Écrire, avancer l'indice modulo n, mettre à jour le compteur. On tient le mutex." },
  { label: "6. Réveiller seulement si quelqu'un dort", mark: [7, 8], why: "signal si un seul peut avancer (une condition par type). broadcast si tous peuvent, ou si deux types partagent une condition." },
  { label: "7. Rendre le mutex", mark: [9], why: "Toutes les fonctions finissent par mtx_unlock. Copier ce qu'on renvoie avant." },
];

// ---------------------------------------------------------------------------
// 5. TP3 : nommer la classe du bug
// ---------------------------------------------------------------------------

type Verdict = "ok" | "ko" | "bof";
interface Version {
  id: string;
  code: string;
  obs: string;
  classe: string;
  surete: Verdict;
  vivacite: Verdict;
}

const VERSIONS: Version[] = [
  { id: "Prérequis", code: "void debutSectionCritique(int me) {}   // vide", obs: "Assertion a == b failed dans Check, tout de suite.", classe: "Exclusion mutuelle violée (sûreté).", surete: "ko", vivacite: "ok" },
  { id: "V0", code: "static atomic_int a = 0;\nstatic atomic_int b = 0;", obs: "Pareil : Assertion a == b failed.", classe: "Exclusion mutuelle violée : chaque a++ est atomique, pas la paire a++; b++.", surete: "ko", vivacite: "ok" },
  { id: "V1", code: "alpha:\n  if (occupation) goto alpha;\n  occupation = true;", obs: "Assertion a == b failed.", classe: "Exclusion mutuelle violée : tester puis prendre en deux étapes.", surete: "ko", vivacite: "ok" },
  { id: "V2", code: "  occupation = true;\nalpha:\n  if (occupation) goto alpha;", obs: "Ne finit jamais, 2 cœurs à 100 %.", classe: "Interblocage : chaque thread s'attend lui-même.", surete: "ok", vivacite: "ko" },
  { id: "V3", code: "alpha:\n  if (me != tour) goto alpha;\n// fin : tour = 1 - me;", obs: "2 threads : marche. 1 seul thread : bloqué pour toujours.", classe: "Famine : alternance stricte.", surete: "ok", vivacite: "ko" },
  { id: "V4", code: "  demande_et_occupation[me] = true;\nalpha:\n  if (demande_et_occupation[1 - me]) goto alpha;", obs: "Ne finit jamais, 2 cœurs à 100 %.", classe: "Interblocage : chacun attend que l'autre baisse son drapeau.", surete: "ok", vivacite: "ko" },
  { id: "V5", code: "alpha:\n  demande_et_occupation[me] = true;\n  if (demande_et_occupation[1 - me]) {\n    demande_et_occupation[me] = false;\n    goto alpha;\n  }", obs: "Finit en pratique : le bug ne se voit pas.", classe: "Vivacité non garantie : interblocage actif (livelock) possible.", surete: "ok", vivacite: "bof" },
  { id: "V5.5", code: "    demande_et_occupation[me] = false;\n    usleep(drand48() * 10);\n    goto alpha;", obs: "Marche, rapide.", classe: "Pas de bug, mais probabiliste et pas équitable.", surete: "ok", vivacite: "bof" },
  { id: "V6", code: "  if (demande_et_occupation[1 - me]) {\n    if (tour != me)\n      demande_et_occupation[me] = false;\n    goto alpha;\n  }", obs: "2 cœurs à 100 %, très lent ou sans fin selon les lancements.", classe: "Vivacité non garantie : celui qui cède relève son drapeau tout de suite.", surete: "ok", vivacite: "bof" },
  { id: "Dekker", code: "    if (tour != me) {\n      demande_et_occupation[me] = false;\n    gamma:\n      if (tour != me) goto gamma;\n      goto alpha;\n    }\n    goto beta;", obs: "Marche.", classe: "Correct : drapeaux + tour. 2 threads, attente active, atomic_bool.", surete: "ok", vivacite: "ok" },
  { id: "Peterson", code: "  demande_et_occupation[me] = true;\n  dernier = me;\nalpha:\n  if (demande_et_occupation[1 - me] && dernier == me)\n    goto alpha;", obs: "Marche.", classe: "Correct : le dernier arrivé cède. 2 threads, attente active, atomic_bool.", surete: "ok", vivacite: "ok" },
  { id: "Mutex", code: "void debutSectionCritique(int me) { mtx_lock(&m); }\nvoid finSectionCritique(int me)   { mtx_unlock(&m); }", obs: "Marche ; du temps sys (endormir, réveiller).", classe: "Correct, sans attente active : 0 % de CPU en attendant.", surete: "ok", vivacite: "ok" },
  { id: "RWMutex", code: "pthread_rwlock_wrlock(&rw);   // DoubleInc\npthread_rwlock_rdlock(&rw);   // Check", obs: "Marche, mais les écrivains finissent après tous les lecteurs.", classe: "Correct, mais famine des écrivains (priorité aux lecteurs par défaut).", surete: "ok", vivacite: "bof" },
  { id: "Spinlock", code: "pthread_spin_lock(&s);  /* … */  pthread_spin_unlock(&s);", obs: "Marche, sys = 0.", classe: "Correct, attente active bien faite : tester et prendre en une opération.", surete: "ok", vivacite: "ok" },
];

function Badge({ label, v }: { label: string; v: Verdict }) {
  const color = v === "ok" ? "green" : v === "ko" ? "red" : "yellow";
  const sign = v === "ok" ? "✓" : v === "ko" ? "✗" : "?";
  return (
    <Tag color={color}>
      {label} {sign}
    </Tag>
  );
}

function Versions() {
  const [id, setId] = useState("V2");
  const v = VERSIONS.find((x) => x.id === id) ?? VERSIONS[0];
  return (
    <Figure caption="Une seule question : quelque chose de mauvais arrive-t-il (sûreté) ? Quelque chose de bon n'arrive-t-il jamais (vivacité) ? « ? » = pas garantie.">
      <div className="space-y-4">
        <Choice options={VERSIONS.map((x) => x.id)} value={id} onChange={setId} />
        <motion.div key={v.id} className="grid gap-4 md:grid-cols-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Code code={v.code} />
          <div className="space-y-2 text-[15px]">
            <div className="flex flex-wrap gap-2">
              <Badge label="sûreté" v={v.surete} />
              <Badge label="vivacité" v={v.vivacite} />
            </div>
            <p>
              <span className="text-fg-weak">On observe : </span>
              {v.obs}
            </p>
            <p className="text-fg-strong">{v.classe}</p>
          </div>
        </motion.div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 6. Liste de vérification
// ---------------------------------------------------------------------------

const CHECKS = [
  "Lire l'énoncé (man -l, info -f) ; trouver dans le squelette les commentaires qui disent où coder.",
  "Compiler avec -Wall : zéro avertissement.",
  "Chaque fonction du moniteur : mtx_lock au début, mtx_unlock à la fin.",
  "while autour de chaque cnd_wait, sur la condition où arrive le réveil.",
  "Une condition pour deux types de threads → broadcast.",
  "sem_wait avant mtx_lock ; sem_post après l'écriture ; valeurs initiales n et 0.",
  "Tous les champs initialisés dans init / new (malloc ne met pas à zéro).",
  "% n sur les indices ; copier le message avant le unlock.",
  "Après execvp : perror puis exit. pipe avant fork, puis fermer toutes les extrémités inutiles, père compris.",
  "Petit test à la main : add 1, 2, 3 puis 3 pop → 1, 2, 3.",
  "time ./prog et top : 0 % = bloqué, 100 % = tourne.",
  "Tout détruire à la fin : cnd_destroy, mtx_destroy, sem_destroy, free.",
];

function Checklist() {
  const [done, setDone] = useState<boolean[]>(() => CHECKS.map(() => false));
  const n = done.filter(Boolean).length;
  return (
    <div className="border border-line bg-raised p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">Avant de rendre</p>
        <span className="font-mono text-[13px] text-fg-weak">
          {n}/{CHECKS.length}
        </span>
      </div>
      <div className="mt-3 h-1 w-full bg-weaker">
        <motion.div className="h-1 bg-link" initial={false} animate={{ width: `${(100 * n) / CHECKS.length}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {CHECKS.map((c, k) => (
          <li key={c}>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1.5 accent-[var(--link)]"
                checked={done[k]}
                onChange={() => setDone((d) => d.map((x, j) => (j === k ? !x : x)))}
              />
              <span className={done[k] ? "text-fg-weaker line-through" : ""}>{c}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function ExamenTp() {
  return (
    <>
      <Section title="L'idée">
        <Idea>En 2 h sur machine : écrire de mémoire un motif connu, compiler avec -Wall, tester sur un petit cas, puis reconnaître le bug à son symptôme.</Idea>
        <p>Le sujet dit quoi faire (comportement, appels système). Les commentaires du squelette disent où coder.</p>
        <p>Un programme qui se termine n'est pas forcément correct. Un programme lent n'est pas forcément bloqué.</p>
      </Section>

      <Section title="Compiler, lancer, mesurer">
        <Code lang="bash" code={COMMANDES} />
        <table className="ftable">
          <thead>
            <tr>
              <th>Dans time ou top</th>
              <th>Ce que ça veut dire</th>
              <th>Vu en TP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>user ≈ 2 × real</td>
              <td>2 cœurs tournent à 100 % (attente active)</td>
              <td>V2 : real 5 s, user 10 s</td>
            </tr>
            <tr>
              <td>sys élevé</td>
              <td>temps dans le noyau à endormir et réveiller des threads</td>
              <td>mutex : sys 0,54 s ; channel moniteur : sys 70 s</td>
            </tr>
            <tr>
              <td>sys = 0</td>
              <td>personne ne dort : on tourne sur le verrou</td>
              <td>spinlock</td>
            </tr>
            <tr>
              <td>figé, 0 % dans top</td>
              <td>tout le monde dort : interblocage ou réveil perdu</td>
              <td>TP4 bug 2, TP5 signal</td>
            </tr>
          </tbody>
        </table>
        <Note title="Pièges d'environnement">
          <p>Sur Mac : pas de &lt;threads.h&gt;, et sem_init renvoie −1. Tout se fait dans le Linux du conteneur.</p>
          <p>Pas de -std=c23 strict : glibc y cache pthread_rwlock_t. Le défaut (gnu23) marche.</p>
          <p>Option+Espace tape une espace insécable : GCC répond stray '\302'. Retaper l'espace.</p>
          <p>-fanalyzer signale « infinite loop » sur les boucles goto d'attente active : faux positif.</p>
        </Note>
      </Section>

      <Section title="Reconnaître le bug à son symptôme">
        <Diagnostic />
      </Section>

      <Section title="Les motifs à écrire de mémoire">
        <Motifs />
        <table className="ftable">
          <thead>
            <tr>
              <th>Condition (moniteur)</th>
              <th>Sémaphore</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>pas de mémoire : un signal sans personne qui dort est perdu</td>
              <td>a une mémoire : un sem_post sans personne n'est pas perdu</td>
            </tr>
            <tr>
              <td>while autour de cnd_wait</td>
              <td>pas de while autour de sem_wait</td>
            </tr>
            <tr>
              <td>l'état vit dans des compteurs (nbmessage, nb_attente…)</td>
              <td>les sémaphores comptent eux-mêmes</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Le moniteur, ligne par ligne">
        <Stepper steps={MON_STEPS.map((s) => s.label)} interval={2600} caption="Le squelette de toute fonction de moniteur (aide-mémoire). Le refaire de tête avant l'examen.">
          {(i) => (
            <div className="space-y-3">
              <Code code={MON_CODE} mark={MON_STEPS[i].mark} />
              <motion.p key={i} className="border-l-2 border-link pl-4 text-[15px]" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                {MON_STEPS[i].why}
              </motion.p>
            </div>
          )}
        </Stepper>
      </Section>

      <Section title="Attente active : nommer la classe du bug">
        <p>
          Au TP3, le but n'est pas d'écrire un programme correct : c'est de <strong>nommer le bug</strong> de chaque version.
        </p>
        <Versions />
      </Section>

      <Section title="Liste de vérification">
        <Checklist />
        <Points>
          <li>0 % de CPU et figé : interblocage ou réveil perdu. 100 % sans fin : attente active qui ne sort pas.</li>
          <li>while autour de cnd_wait ; une condition partagée par deux types → broadcast.</li>
          <li>Chaque cnd_wait sur la condition où les autres envoient le réveil.</li>
          <li>sem_wait avant mtx_lock : ne jamais dormir en tenant un mutex.</li>
          <li>atomic_bool pour les drapeaux de Peterson et Dekker.</li>
          <li>Pour comparer deux versions : mêmes options de compilation (-O2).</li>
        </Points>
        <Trap>
          <p>Croire qu'un programme qui se termine est correct. Le squelette du channel ne vérifie pas les messages : avec i_read jamais avancé, il se termine et renvoie 1, 1, 1.</p>
        </Trap>
        <Reveal question={<p>Ton channel en moniteur se fige, et top affiche 0 % de CPU. Quelle classe de bug, et que vérifier d'abord ?</p>}>
          <p>
            <strong>Interblocage ou réveil perdu</strong> : tout le monde dort. Vérifier : une seule condition pour producteurs et consommateurs avec cnd_signal (il faut broadcast) ; un cnd_wait sur la mauvaise condition ; un compteur d'attente non initialisé.
          </p>
        </Reveal>
        <Reveal question={<p>V2 ne finit jamais avec 2 cœurs à 100 %. Un moniteur interbloqué est à 0 %. Pourquoi cette différence ?</p>}>
          <p>V2 attend en attente active : chaque thread reboucle sur son test et consomme un cœur. Avec cnd_wait ou un mutex, le thread qui attend dort dans le noyau : 0 % de CPU.</p>
        </Reveal>
        <Reveal question={<p>Dans la version sémaphores, que se passe-t-il si on fait mtx_lock avant sem_wait ?</p>}>
          <p>Un producteur peut s'endormir sur un tampon plein en tenant le mutex. Avec deux mutex séparés, ça finit quand même, mais en 46 s au lieu de 16 s. Avec un seul mutex commun, c'est un interblocage : le consommateur ne peut plus libérer de place.</p>
        </Reveal>
        <Reveal question={<p>Le fils de ton shell rate execvp (commande inconnue). Que faut-il écrire après, et pourquoi ?</p>}>
          <p>perror(cmd[0]) puis exit(1). Sans exit, le fils continue le code du shell, remonte dans le while et lit les commandes lui aussi : deux shells sur le même terminal.</p>
        </Reveal>
      </Section>
    </>
  );
}
