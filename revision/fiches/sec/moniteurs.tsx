"use client";
// Fiche CM4 Moniteurs : mutex + variables de condition, cnd_wait, signal / broadcast, parking (if vs while),
// lecteurs-rédacteurs (TP RWMutex) et channel (TP Channel).
import { useState } from "react";
import { ArrowMarkers, C, Choice, Code, Figure, Idea, Points, Reveal, Section, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// Scène du parking : extérieur | salle « moniteur » | file « libre » | parking
// ---------------------------------------------------------------------------

type Car = "A" | "B" | "C" | "D";
const CAR_COLOR: Record<Car, string> = { A: C.orange, B: C.blue, C: C.green, D: C.weak };

interface CarState {
  x: number;
  y: number;
  o?: number; // opacité
  ring?: "awake" | "bad"; // réveillée (jaune) ou en trop (rouge)
  keys?: { x: number[]; y: number[] }; // trajet en plusieurs points
}

interface Scene {
  title: string;
  door: "libre" | "prise";
  places: number;
  cars: Record<Car, CarState>;
  note?: { text: string; color: string };
  code?: string;
}

const POS = {
  room: { x: 300, y: 112 },
  file: { x: 236, y: 244 },
  slot1: { x: 545, y: 112 },
  slot2: { x: 675, y: 112 },
  between: { x: 610, y: 112 },
  outside: { x: 70, y: 112 },
  hidden: { x: 20, y: 112, o: 0 },
  gone: { x: 20, y: 40, o: 0 },
};

function CarDot({ id, s }: { id: Car; s: CarState }) {
  const animate = s.keys ? { x: s.keys.x, y: s.keys.y, opacity: s.o ?? 1 } : { x: s.x, y: s.y, opacity: s.o ?? 1 };
  return (
    <motion.g initial={false} animate={animate} transition={{ duration: s.keys ? 1.2 : 0.7, ease: "easeInOut" }}>
      {s.ring && <circle r={21} fill="none" stroke={s.ring === "awake" ? C.yellow : C.red} strokeWidth={2.5} strokeDasharray={s.ring === "bad" ? "4 3" : undefined} />}
      <circle r={15} fill={C.paper} stroke={CAR_COLOR[id]} strokeWidth={2.5} />
      <text y={5} textAnchor="middle" fill={CAR_COLOR[id]} fontSize={14} fontWeight={600}>
        {id}
      </text>
    </motion.g>
  );
}

function ParkingScene({ s }: { s: Scene }) {
  const doorColor = s.door === "libre" ? C.green : C.red;
  return (
    <svg viewBox="0 0 760 300" className="w-full max-w-[760px]" role="img" aria-label="Parking géré par un moniteur">
      <text x={14} y={24} fill={C.weak} fontSize={12}>
        extérieur
      </text>
      {/* salle du moniteur */}
      <rect x={170} y={34} width={250} height={130} fill={C.paper} stroke={C.lineStrong} />
      <text x={186} y={56} fill={C.ink} fontSize={13}>
        {s.title}
      </text>
      <motion.text key={s.places} x={404} y={150} textAnchor="end" fill={s.places < 0 ? C.red : C.ink} fontSize={15} fontWeight={600} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}>
        places = {s.places}
      </motion.text>
      <motion.rect x={163} y={86} width={14} height={52} initial={false} animate={{ fill: doorColor }} fill={doorColor} />
      <text x={156} y={156} textAnchor="end" fill={doorColor} fontSize={12}>
        mutex m : {s.door}
      </text>
      {/* file d'attente de la condition */}
      <rect x={170} y={194} width={250} height={92} fill={C.fill} stroke={C.lineStrong} strokeDasharray="5 4" />
      <text x={186} y={214} fill={C.weak} fontSize={12}>
        file : libre
      </text>
      {/* parking */}
      <rect x={470} y={34} width={276} height={130} fill={C.paper} stroke={C.lineStrong} />
      <text x={486} y={56} fill={C.ink} fontSize={13}>
        parking (2 places)
      </text>
      {[490, 620].map((x) => (
        <rect key={x} x={x} y={74} width={110} height={76} fill="none" stroke={C.line} strokeDasharray="4 4" />
      ))}
      {s.code && (
        <text x={470} y={198} fill={C.text} fontSize={13}>
          {s.code}
        </text>
      )}
      {s.code && (
        <text x={501} y={218} fill={C.text} fontSize={13}>
          {"cnd_wait(&p->libre, &p->m);"}
        </text>
      )}
      {s.note && (
        <motion.text key={s.note.text} x={470} y={256} fill={s.note.color} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          {s.note.text}
        </motion.text>
      )}
      {(Object.keys(s.cars) as Car[]).map((id) => (
        <CarDot key={id} id={id} s={s.cars[id]} />
      ))}
    </svg>
  );
}

// --- cnd_wait en trois temps ------------------------------------------------

const WAIT_STEPS = [
  "Les deux places sont prises. A prend le mutex et entre",
  "A teste places == 0 : vrai, elle appelle cnd_wait",
  "1. cnd_wait rend le mutex : d'autres peuvent entrer",
  "2. A dort dans la file de la condition libre",
  "3. Au réveil, elle reprendra le mutex avant de revenir",
];

function waitScene(i: number): Scene {
  const base = { B: { ...POS.slot1 }, C: { ...POS.hidden }, D: { ...POS.slot2 } };
  const A: CarState = i <= 2 ? { ...POS.room } : { ...POS.file };
  return {
    title: "moniteur",
    door: i <= 1 ? "prise" : "libre",
    places: 0,
    cars: { A, ...base },
    note:
      i === 1
        ? { text: "while (p->places == 0) → vrai", color: C.text }
        : i === 2
          ? { text: "mutex rendu", color: C.green }
          : i === 3
            ? { text: "A dort (0 % de CPU)", color: C.text }
            : i === 4
              ? { text: "réveil → reprendre le mutex → re-tester", color: C.yellow }
              : undefined,
  };
}

// --- le scénario if / while ---------------------------------------------------

type Mode = "if" | "while";

const PARK_COMMON = [
  "places = 0 : B et D sont garées, A dort dans la file libre",
  "B sort : elle prend le mutex, places 0 → 1, cnd_signal réveille A",
  "B rend le mutex et part. A n'a aucune priorité",
  "C arrive et prend le mutex avant A : places 1 → 0",
  "C rend le mutex et se gare",
];
const PARK_END: Record<Mode, [string, string]> = {
  if: ["A reprend le mutex. Avec if, pas de re-test : places 0 → −1", "A se gare : trois voitures pour deux places ✗"],
  while: ["A reprend le mutex. Avec while, elle re-teste : places == 0 est vrai", "A rappelle cnd_wait : rend le mutex et se rendort ✓"],
};

function parkScene(i: number, mode: Mode): Scene {
  const awake = i >= 1 && i <= 4;
  const A: CarState = i <= 4 ? { ...POS.file, ring: awake ? "awake" : undefined } : i === 5 ? { ...POS.room } : mode === "if" ? { ...POS.between, ring: "bad" } : { ...POS.file };
  const B: CarState = i === 0 ? { ...POS.slot1 } : i === 1 ? { ...POS.room } : { ...POS.gone };
  const Cc: CarState = i <= 2 ? { ...POS.hidden } : i === 3 ? { ...POS.room } : { ...POS.slot1 };
  const places = i === 0 ? 0 : i <= 2 ? 1 : i <= 4 ? 0 : mode === "if" ? -1 : 0;
  const door = i === 1 || i === 3 || i === 5 ? "prise" : "libre";
  const notes: (Scene["note"] | undefined)[] = [
    undefined,
    { text: "cnd_signal(&p->libre) : A réveillée", color: C.yellow },
    { text: "A attend de reprendre le mutex", color: C.yellow },
    { text: "C : places == 0 ? faux → places--", color: C.green },
    undefined,
    mode === "if" ? { text: "if : pas de re-test → places--", color: C.red } : { text: "while : re-test → vrai → cnd_wait", color: C.green },
    mode === "if" ? { text: "places = −1 : 3 voitures, 2 places ✗", color: C.red } : { text: "places reste 0 : correct ✓", color: C.green },
  ];
  return {
    title: `entrer() avec ${mode}`,
    door,
    places,
    cars: { A, B, C: Cc, D: { ...POS.slot2 } },
    note: notes[i],
    code: `${mode} (p->places == 0)`,
  };
}

// ---------------------------------------------------------------------------
// signal, broadcast, signal perdu
// ---------------------------------------------------------------------------

type Wake = "signal" | "broadcast" | "vide";

function WakeDemo({ mode }: { mode: Wake }) {
  const threads = mode === "vide" ? [] : ["T1", "T2", "T3"];
  const leaves = (k: number) => mode === "broadcast" || (mode === "signal" && k === 0);
  return (
    <svg key={mode} viewBox="0 0 660 230" className="w-full max-w-[660px]" role="img" aria-label="Effet de cnd_signal et cnd_broadcast sur la file">
      <ArrowMarkers />
      <rect x={220} y={40} width={230} height={100} fill={C.fill} stroke={C.lineStrong} strokeDasharray="5 4" />
      <text x={232} y={60} fill={C.weak} fontSize={12}>
        file : libre
      </text>
      <motion.g initial={{ x: 0, opacity: 0 }} animate={mode === "vide" ? { x: [0, 150, 170], opacity: [1, 1, 0] } : { x: [0, 70], opacity: [1, 1] }} transition={{ duration: 1.1, times: mode === "vide" ? [0, 0.7, 1] : undefined }}>
        <polyline points="40,82 62,92 50,96 74,108" fill="none" stroke={C.yellow} strokeWidth={3} />
        <text x={30} y={130} fill={C.yellow} fontSize={13}>
          {mode === "broadcast" ? "cnd_broadcast" : "cnd_signal"}
        </text>
      </motion.g>
      {threads.map((t, k) => (
        <motion.g
          key={t}
          initial={{ x: 280 + k * 55, y: 100 }}
          animate={leaves(k) ? { x: 540, y: 60 + k * 50 } : { x: 280 + k * 55, y: 100 }}
          transition={{ duration: 0.8, delay: 1 + k * 0.2 }}
        >
          <circle r={16} fill={C.paper} stroke={leaves(k) ? C.yellow : C.weak} strokeWidth={2} />
          <text y={5} textAnchor="middle" fill={C.ink} fontSize={13}>
            {t}
          </text>
        </motion.g>
      ))}
      {mode === "vide" && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <text x={335} y={100} textAnchor="middle" fill={C.red} fontSize={14}>
            perdu
          </text>
          <rect x={490} y={50} width={150} height={36} fill={C.paper} stroke={C.green} />
          <text x={565} y={73} textAnchor="middle" fill={C.ink} fontSize={13}>
            places = 1
          </text>
        </motion.g>
      )}
      {mode === "vide" && (
        <motion.g initial={{ x: 565, y: 240, opacity: 0 }} animate={{ x: 565, y: 122, opacity: 1 }} transition={{ delay: 2, duration: 0.8 }}>
          <circle r={15} fill={C.paper} stroke={C.orange} strokeWidth={2.5} />
          <text y={5} textAnchor="middle" fill={C.orange} fontSize={14} fontWeight={600}>
            A
          </text>
        </motion.g>
      )}
      <motion.text x={20} y={mode === "vide" ? 190 : 214} fill={mode === "vide" ? C.red : C.text} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
        {mode === "signal"
          ? "un seul thread réveillé (T1) ; T2 et T3 dorment toujours"
          : mode === "broadcast"
            ? "tous réveillés : chacun re-teste son while"
            : "file vide : personne ne garde le signal"}
      </motion.text>
      {mode === "vide" && (
        <motion.text x={20} y={214} fill={C.green} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
          plus tard, A lit places = 1 et n'attend pas : l'état vit dans places
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lecteurs-rédacteurs (priorité aux rédacteurs)
// ---------------------------------------------------------------------------

type Rid = "L1" | "L2" | "L3" | "L4" | "R";

const RW_STEPS = [
  "L1 et L2 entrent ensemble : lecteurs 0 → 2",
  "R arrive : la base est occupée, il va dans la file des rédacteurs",
  "L3 arrive : un rédacteur attend, il va dans la file des lecteurs",
  "L1 et L2 sortent : le dernier réveille R (signal), R entre seul",
  "L4 arrive pendant l'écriture : file des lecteurs (L3, L4)",
  "R sort, aucun rédacteur n'attend : cnd_broadcast, L3 et L4 entrent",
];

function rwState(i: number): { pos: Record<Rid, { x: number; y: number; o: number }>; lect: number; red: number } {
  const hid = (y: number) => ({ x: 30, y, o: 0 });
  const base = (k: number) => ({ x: 300 + k * 44, y: 100, o: 1 });
  const fileL = (k: number) => ({ x: 210 + k * 44, y: 236, o: 1 });
  const fileR = { x: 450, y: 236, o: 1 };
  const out = (y: number) => ({ x: 30, y, o: 0 });
  const pos: Record<Rid, { x: number; y: number; o: number }> = {
    L1: i <= 2 ? base(0) : out(70),
    L2: i <= 2 ? base(1) : out(110),
    L3: i < 2 ? hid(150) : i <= 4 ? fileL(0) : base(0),
    L4: i < 4 ? hid(190) : i === 4 ? fileL(1) : base(1),
    R: i < 1 ? hid(230) : i <= 2 ? fileR : i <= 4 ? { x: 360, y: 100, o: 1 } : out(40),
  };
  const lect = i <= 2 ? 2 : i <= 4 ? 0 : 2;
  const red = i === 3 || i === 4 ? 1 : 0;
  return { pos, lect, red };
}

function ReadersWriters({ i }: { i: number }) {
  const { pos, lect, red } = rwState(i);
  return (
    <svg viewBox="0 0 640 290" className="w-full max-w-[640px]" role="img" aria-label="Lecteurs et rédacteurs avec priorité aux rédacteurs">
      <text x={14} y={24} fill={C.weak} fontSize={12}>
        extérieur
      </text>
      <rect x={250} y={30} width={240} height={110} fill={C.paper} stroke={C.lineStrong} />
      <text x={264} y={52} fill={C.ink} fontSize={13}>
        base
      </text>
      <motion.text key={`l${lect}`} x={476} y={52} textAnchor="end" fill={C.blue} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        lecteurs = {lect}
      </motion.text>
      <motion.text key={`r${red}`} x={476} y={130} textAnchor="end" fill={C.red} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        rédacteur = {red}
      </motion.text>
      <rect x={170} y={180} width={200} height={90} fill={C.fill} stroke={C.lineStrong} strokeDasharray="5 4" />
      <text x={182} y={198} fill={C.weak} fontSize={12}>
        file lecteurs
      </text>
      <rect x={390} y={180} width={130} height={90} fill={C.fill} stroke={C.lineStrong} strokeDasharray="5 4" />
      <text x={402} y={198} fill={C.weak} fontSize={12}>
        file rédacteurs
      </text>
      {i === 5 && (
        <motion.text x={540} y={230} fill={C.yellow} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          broadcast
        </motion.text>
      )}
      {i === 3 && (
        <motion.text x={540} y={230} fill={C.yellow} fontSize={12} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          signal
        </motion.text>
      )}
      {(Object.keys(pos) as Rid[]).map((id) => (
        <motion.g key={id} initial={false} animate={{ x: pos[id].x, y: pos[id].y, opacity: pos[id].o }} transition={{ duration: 0.8, ease: "easeInOut" }}>
          <circle r={17} fill={C.paper} stroke={id === "R" ? C.red : C.blue} strokeWidth={2.5} />
          <text y={5} textAnchor="middle" fill={id === "R" ? C.red : C.blue} fontSize={13} fontWeight={600}>
            {id}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function Moniteurs() {
  const [mode, setMode] = useState<Mode>("if");
  const [wake, setWake] = useState<Wake>("signal");
  return (
    <>
      <Section title="L'idée">
        <Idea>Un moniteur, ce sont des variables d'état, des fonctions sous un seul mutex, et des files d'attente (variables de condition). On attend toujours dans un while.</Idea>
        <p>Exemple du cours : un parking de 2 places, 3 voitures A, B, C. Chaque voiture est un thread.</p>
        <p>
          Le nombre de places libres, <code>places</code>, est une variable partagée.
        </p>
      </Section>

      <Section title="Le moniteur et cnd_wait">
        <Code
          mark={[3, 4]}
          code={`void entrer(parking_t *p) {
    mtx_lock(&p->m);
    while (p->places == 0)
        cnd_wait(&p->libre, &p->m);
    p->places--;
    mtx_unlock(&p->m);
}
void sortir(parking_t *p) {
    mtx_lock(&p->m);
    p->places++;
    cnd_signal(&p->libre);
    mtx_unlock(&p->m);
}`}
        />
        <ul className="flist">
          <li>Le mutex est la seule porte : une voiture à la fois dans la salle.</li>
          <li>La condition libre est une salle d'attente à côté.</li>
        </ul>
        <Stepper steps={WAIT_STEPS} interval={2200} caption="cnd_wait fait trois choses : rendre le mutex, dormir dans la file, reprendre le mutex au réveil. Elle ne repart jamais sans lui.">
          {(i) => <ParkingScene s={waitScene(i)} />}
        </Stepper>
      </Section>

      <Section title="if ou while : le scénario du parking">
        <p>Avec un if, le compteur de places peut devenir négatif. Rejouer les deux versions.</p>
        <Choice
          label="entrer() avec"
          options={[
            { value: "if", label: "if" },
            { value: "while", label: "while" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <Stepper steps={[...PARK_COMMON, ...PARK_END[mode]]} interval={2400} caption="Avec POSIX, celui qui signale garde le mutex. Être réveillé ne donne pas la main : C passe avant A.">
          {(i) => <ParkingScene s={parkScene(i, mode)} />}
        </Stepper>
        <p>
          <strong>Règle d'or</strong> : on re-teste la condition à chaque réveil, dans un while.
        </p>
      </Section>

      <Section title="signal, broadcast et signal perdu">
        <Figure caption="cnd_signal réveille un thread de la file ; cnd_broadcast les réveille tous. Une condition n'a pas de mémoire : un signal sur une file vide est perdu.">
          <div className="space-y-4">
            <Choice
              options={[
                { value: "signal", label: "cnd_signal" },
                { value: "broadcast", label: "cnd_broadcast" },
                { value: "vide", label: "signal, file vide" },
              ]}
              value={wake}
              onChange={setWake}
            />
            <WakeDemo mode={wake} />
          </div>
        </Figure>
        <ul className="flist">
          <li>
            <strong>signal</strong> si un seul peut avancer (un rédacteur) ; <strong>broadcast</strong> si plusieurs peuvent repartir (des lecteurs).
          </li>
          <li>
            Une seule condition pour deux types de threads (TP Channel) : <strong>broadcast</strong> obligatoire.
          </li>
        </ul>
      </Section>

      <Section title="Lecteurs-rédacteurs">
        <p>Plusieurs lecteurs ensemble, ou un rédacteur seul. Priorité aux rédacteurs : un lecteur attend si un rédacteur écrit ou attend.</p>
        <Stepper steps={RW_STEPS} interval={2400} caption="Scénario du cours. Le rédacteur qui sort fait un broadcast : tous les lecteurs peuvent lire ensemble.">
          {(i) => <ReadersWriters i={i} />}
        </Stepper>
        <table className="ftable">
          <thead>
            <tr>
              <th>Fonction (TP RWMutex)</th>
              <th>Attend tant que (while)</th>
              <th>Réveille en sortant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>rdlock</code>
              </td>
              <td>
                <code>ecrivain_actif || nb_ecrivain_attente &gt; 0</code>, sur <code>cnd_lecteurs</code>
              </td>
              <td></td>
            </tr>
            <tr>
              <td>
                <code>rdunlock</code>
              </td>
              <td></td>
              <td>dernier lecteur et un rédacteur attend : <code>cnd_signal(&amp;cnd_ecrivains)</code></td>
            </tr>
            <tr>
              <td>
                <code>wrlock</code>
              </td>
              <td>
                <code>ecrivain_actif || nb_lecteur_actif &gt; 0</code>, sur <code>cnd_ecrivains</code>
              </td>
              <td></td>
            </tr>
            <tr>
              <td>
                <code>wrunlock</code>
              </td>
              <td></td>
              <td>
                un rédacteur attend : <code>cnd_signal(&amp;cnd_ecrivains)</code> ; sinon <code>cnd_broadcast(&amp;cnd_lecteurs)</code>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Le code à connaître">
        <p>Le motif de toute fonction de moniteur (aide-mémoire des TP) :</p>
        <Code
          mark={[3, 4]}
          code={`mtx_lock(&m);                       // au début de TOUTES les fonctions
nb_attente++;
while (!je_peux_continuer)          // while, jamais if
    cnd_wait(&ma_file, &m);
nb_attente--;
/* modifier l'état */
if (nb_attente_autre_cote > 0)
    cnd_signal(&file_autre_cote);   // ou broadcast
mtx_unlock(&m);                     // à la fin de TOUTES les fonctions`}
        />
        <p>Les compteurs d'attente servent à décider qui réveiller, et à ne réveiller que s'il y a quelqu'un.</p>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Moniteur = variables d'état + fonctions qui commencent par mtx_lock et finissent par mtx_unlock + variables de condition (files).</li>
          <li>cnd_wait : rendre le mutex et dormir (d'un seul coup), puis reprendre le mutex au réveil.</li>
          <li>signal : un réveil ; broadcast : tous ; file vide : signal perdu.</li>
          <li>L'état vit dans les variables (places), pas dans le fait d'avoir été réveillé.</li>
          <li>Toujours while (condition) cnd_wait(…) : un autre thread a pu passer avant.</li>
          <li>Chaque cnd_wait se fait sur la condition où les autres envoient le réveil.</li>
        </Points>
        <Trap>
          <p>
            <strong>if au lieu de while.</strong> Au parking, places passe à −1. Au TP Channel, le tampon déborde à chaque exécution (nbmessage &gt; n).
          </p>
          <p>
            <strong>Une condition pour deux types + cnd_signal.</strong> Le signal peut réveiller un thread du mauvais type : réveil perdu, tout le monde dort, programme figé à 0 % de CPU. Il faut cnd_broadcast (ou deux conditions).
          </p>
        </Trap>
        <Reveal question={<p>Que fait <code>cnd_wait(&amp;c, &amp;m)</code>, dans l'ordre ?</p>}>
          <p>
            1. Il rend le mutex <code>m</code>. 2. Il endort le thread dans la file de <code>c</code> (les deux d'un seul coup). 3. Au réveil, il reprend <code>m</code> avant de revenir.
          </p>
        </Reveal>
        <Reveal question={<p>Pourquoi attendre dans un while et pas dans un if ? Donner un scénario.</p>}>
          <p>
            Places = 0, A dort. B sort, places = 1, signal : A est réveillée mais B garde le mutex. B le rend ; C passe avant A et prend la place (places = 0). Avec if, A décrémente sans re-tester : places = −1. Avec while, A re-teste, voit 0 et se rendort.
          </p>
        </Reveal>
        <Reveal question={<p>Deux lecteurs lisent, un rédacteur attend. Un nouveau lecteur arrive. Entre-t-il (priorité aux rédacteurs) ?</p>}>
          <p>
            <strong>Non.</strong> rdlock attend tant que <code>ecrivain_actif || nb_ecrivain_attente &gt; 0</code>. Il se range derrière le rédacteur. Sans ce test, les lecteurs se relaient et le rédacteur est affamé.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
