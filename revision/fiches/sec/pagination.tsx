"use client";
// Fiche CM7 Pagination : exercice du cours (36 bits, pages de 16 Kio, entrées de 8 o),
// puis traduction de l'adresse x86-64 0x7F3A1C2D4E5F.
import { useState } from "react";
import { ArrowMarkers, C, Choice, Figure, Formula, Idea, Points, Reveal, Section, Slider, Stepper, Trap, motion } from "../kit";

// ---------------------------------------------------------------------------
// 1. Pages, cases et table des pages (schéma du cours, pages de 4 Kio)
// ---------------------------------------------------------------------------

const TABLE: { page: number; cas: number | null; p: 0 | 1; droits: string }[] = [
  { page: 0, cas: 5, p: 1, droits: "RW" },
  { page: 1, cas: 2, p: 1, droits: "R" },
  { page: 2, cas: null, p: 0, droits: "—" },
  { page: 3, cas: 0, p: 1, droits: "RW" },
];
const PAGE = 4096;
const SLOT_Y = (k: number) => 36 + k * 48; // haut de la page k ou de la case k
const SLOT_H = 44;

function PagesCases({ page, off }: { page: number; off: number }) {
  const row = TABLE[page];
  const fy = (k: number) => SLOT_Y(k) + 2 + (off / PAGE) * (SLOT_H - 4);
  const py = fy(page);
  const rowY = 74 + page * 30;
  const cy = row.cas !== null ? fy(row.cas) : 0;
  return (
    <svg viewBox="0 0 720 380" className="w-full max-w-[720px]" role="img" aria-label="Traduction d'une adresse : page, table des pages, case">
      <ArrowMarkers />
      <text x={30} y={22} fill={C.weak} fontSize={12}>
        mémoire virtuelle
      </text>
      {TABLE.map((r, k) => (
        <g key={k}>
          <rect x={30} y={SLOT_Y(k)} width={120} height={SLOT_H} fill={k === page ? C.blue : C.fill} fillOpacity={k === page ? 0.15 : 1} stroke={k === page ? C.blue : C.lineStrong} />
          <text x={38} y={SLOT_Y(k) + 18} fill={C.text} fontSize={12}>
            page {k}
          </text>
        </g>
      ))}

      {/* table des pages */}
      <text x={230} y={22} fill={C.weak} fontSize={12}>
        table des pages (lue par la MMU)
      </text>
      {["page", "case", "P", "droits"].map((h, j) => (
        <text key={h} x={256 + j * 56} y={56} textAnchor="middle" fill={C.weak} fontSize={12}>
          {h}
        </text>
      ))}
      <motion.rect initial={false} animate={{ y: rowY - 20 }} x={228} width={224} height={28} fill={row.p ? C.blue : C.red} fillOpacity={0.14} stroke={row.p ? C.blue : C.red} />
      {TABLE.map((r, k) => (
        <g key={k}>
          {[r.page, r.cas ?? "—", r.p, r.droits].map((v, j) => (
            <text key={j} x={256 + j * 56} y={74 + k * 30} textAnchor="middle" fill={j === 2 && r.p === 0 ? C.red : C.ink} fontSize={13}>
              {v}
            </text>
          ))}
        </g>
      ))}

      {/* mémoire physique */}
      <text x={560} y={22} fill={C.weak} fontSize={12}>
        mémoire physique
      </text>
      {[0, 1, 2, 3, 4, 5].map((j) => (
        <g key={j}>
          <rect x={560} y={SLOT_Y(j)} width={120} height={SLOT_H} fill={j === row.cas ? C.green : C.fill} fillOpacity={j === row.cas ? 0.15 : 1} stroke={j === row.cas ? C.green : C.lineStrong} />
          <text x={568} y={SLOT_Y(j) + 18} fill={C.text} fontSize={12}>
            case {j}
          </text>
        </g>
      ))}

      {/* le point suivi */}
      <motion.circle initial={false} animate={{ cy: py }} cx={128} r={5} fill={C.blue} />
      <motion.line initial={false} animate={{ y1: py, y2: rowY - 6 }} x1={134} x2={224} stroke={C.blue} strokeWidth={1.5} markerEnd="url(#arr-blue)" />
      {row.cas !== null ? (
        <>
          <motion.line initial={false} animate={{ y1: rowY - 6, y2: cy }} x1={456} x2={652} stroke={C.green} strokeWidth={1.5} markerEnd="url(#arr-green)" />
          <motion.circle initial={false} animate={{ cy }} cx={660} r={5} fill={C.green} />
        </>
      ) : (
        <motion.text key="fault" x={340} y={210} textAnchor="middle" fill={C.red} fontSize={14} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          P = 0 : défaut de page
        </motion.text>
      )}

      {/* le calcul */}
      <text x={30} y={348} fill={C.blue} fontSize={13}>
        virtuelle = {page} × 4096 + {off} = {page * PAGE + off}
      </text>
      <text x={30} y={370} fill={row.cas !== null ? C.green : C.red} fontSize={13}>
        {row.cas !== null ? `physique = ${row.cas} × 4096 + ${off} = ${row.cas * PAGE + off}` : "physique : pas de case, le système prend la main"}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. L'exercice : 36 bits, pages de 16 Kio, entrées de 8 octets
// ---------------------------------------------------------------------------

const BX = 54;
const BW = 17; // largeur d'un bit
const bitX = (k: number) => BX + k * BW;

const NIV_STEPS = [
  "Énoncé : adresses de 36 bits, pages de 16 Kio, entrées de 8 o, une table = une page",
  "Déplacement : 16 Kio = 2^14 octets → 14 bits",
  "Entrées par table : 2^14 / 2^3 = 2^11 = 2048 → 11 bits par niveau",
  "Piège : 36 / 11 ≈ 3,27 → « 4 niveaux » : faux",
  "Le déplacement ne passe par aucune table : 36 − 14 = 22 bits à traduire",
  "22 / 11 = 2 niveaux : la bande se lit 11 | 11 | 14",
];

function Niveaux({ i }: { i: number }) {
  const color = (k: number): string | null => {
    if (i >= 1 && k >= 22) return C.orange;
    if (i >= 5) return k < 11 ? C.blue : C.purple;
    if (i >= 4) return C.blue;
    return null;
  };
  return (
    <svg viewBox="0 0 720 270" className="w-full max-w-[720px]" role="img" aria-label="Découpage d'une adresse de 36 bits">
      <text x={BX} y={30} fill={C.weak} fontSize={12}>
        adresse virtuelle : 36 bits
      </text>
      {Array.from({ length: 36 }, (_, k) => {
        const c = color(k);
        return (
          <motion.rect
            key={k}
            x={bitX(k)}
            y={44}
            width={BW}
            height={28}
            initial={false}
            animate={{ fillOpacity: c ? 0.3 : 1 }}
            fill={c ?? C.fill}
            stroke={C.lineStrong}
            transition={{ delay: c ? (k % 14) * 0.02 : 0 }}
          />
        );
      })}

      {/* séparateur du déplacement, glisse depuis la droite */}
      {i >= 1 && (
        <motion.g initial={{ x: 14 * BW }} animate={{ x: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>
          <line x1={bitX(22)} y1={36} x2={bitX(22)} y2={80} stroke={C.orange} strokeWidth={3} />
        </motion.g>
      )}
      {i >= 1 && (
        <motion.text x={bitX(29)} y={96} textAnchor="middle" fill={C.orange} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          déplacement : 14
        </motion.text>
      )}

      {/* le piège : 36 / 11 */}
      {i === 3 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {[11, 22, 33].map((k) => (
            <line key={k} x1={bitX(k)} y1={36} x2={bitX(k)} y2={80} stroke={C.red} strokeWidth={2} strokeDasharray="4 3" />
          ))}
          <text x={bitX(5.5)} y={96} textAnchor="middle" fill={C.red} fontSize={12}>
            11 ?
          </text>
          <text x={bitX(16.5)} y={96} textAnchor="middle" fill={C.red} fontSize={12}>
            11 ?
          </text>
        </motion.g>
      )}

      {/* les bits traduits */}
      {i >= 4 && (
        <motion.text x={i >= 5 ? bitX(5.5) : bitX(11)} y={96} textAnchor="middle" fill={C.blue} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={i >= 5 ? "n1" : "22"}>
          {i >= 5 ? "niveau 1 : 11" : "22 bits traduits par les tables"}
        </motion.text>
      )}
      {i >= 5 && (
        <>
          <motion.g initial={{ x: -11 * BW }} animate={{ x: 0 }} transition={{ duration: 1, ease: "easeOut" }}>
            <line x1={bitX(11)} y1={36} x2={bitX(11)} y2={80} stroke={C.purple} strokeWidth={3} />
          </motion.g>
          <motion.text x={bitX(16.5)} y={96} textAnchor="middle" fill={C.purple} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            niveau 2 : 11
          </motion.text>
        </>
      )}

      {/* les calculs, ligne par ligne */}
      <rect x={BX} y={116} width={612} height={140} fill={C.fill} stroke={C.line} />
      {i >= 1 && (
        <motion.text x={BX + 14} y={142} fill={C.text} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          16 Kio = 16 × 1024 = 2^4 × 2^10 = 2^14 → <tspan fill={C.orange}>14 bits de déplacement</tspan>
        </motion.text>
      )}
      {i >= 2 && (
        <motion.text x={BX + 14} y={170} fill={C.text} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          entrées = 2^14 / 2^3 = 2^11 = 2048 → <tspan fill={C.blue}>11 bits par niveau</tspan>
        </motion.text>
      )}
      {i === 3 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <text x={BX + 14} y={198} fill={C.red} fontSize={13}>
            36 / 11 ≈ 3,27 → « 4 niveaux »
          </text>
          <motion.line x1={BX + 10} y1={194} x2={BX + 250} y2={194} stroke={C.red} strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.5 }} />
          <text x={BX + 270} y={198} fill={C.red} fontSize={13}>
            ✗ le déplacement n'est pas traduit
          </text>
        </motion.g>
      )}
      {i >= 4 && (
        <motion.text x={BX + 14} y={198} fill={C.text} fontSize={13} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          bits traduits = 36 − 14 = 22
        </motion.text>
      )}
      {i >= 5 && (
        <motion.text x={BX + 14} y={234} fill={C.ink} fontSize={15} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          niveaux = (36 − 14) / 11 = 22 / 11 = 2
        </motion.text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Adresse x86-64 : 0x7F3A1C2D4E5F
// ---------------------------------------------------------------------------

const HEX = "7F3A1C2D4E5F";
const BITS = HEX.split("")
  .map((h) => parseInt(h, 16).toString(2).padStart(4, "0"))
  .join("");
const XW = 13;
const XX = 50;
const xb = (k: number) => XX + k * XW;
const FIELDS = [
  { a: 0, b: 9, name: "niveau 1", c: C.blue },
  { a: 9, b: 18, name: "niveau 2", c: C.purple },
  { a: 18, b: 27, name: "niveau 3", c: C.cyan },
  { a: 27, b: 36, name: "niveau 4", c: C.green },
  { a: 36, b: 48, name: "déplacement", c: C.orange },
].map((f) => ({ ...f, v: parseInt(BITS.slice(f.a, f.b), 2) }));
const fieldLabel = (k: number) => (k === 4 ? "0x" + FIELDS[4].v.toString(16).toUpperCase() : String(FIELDS[k].v));

const X86_STEPS = [
  "x86-64 : 48 bits, pages de 4 Kio, tables de 512 entrées de 8 o",
  "On écrit l'adresse en binaire : 4 bits par chiffre hexadécimal",
  "On la découpe en 9 | 9 | 9 | 9 | 12",
  "Champs : 254, 232, 225, 212 ; déplacement 0xE5F",
  "Chaque champ choisit une entrée ; la 4e table donne la case 0x1A2B3",
  "Adresse physique = 0x1A2B3 × 0x1000 + 0xE5F = 0x1A2B3E5F",
];

function X86({ i }: { i: number }) {
  const fieldOf = (k: number) => FIELDS.findIndex((f) => k >= f.a && k < f.b);
  return (
    <svg viewBox="0 0 760 390" className="w-full max-w-[760px]" role="img" aria-label="Traduction de l'adresse x86-64 0x7F3A1C2D4E5F">
      <ArrowMarkers />
      <text x={XX - 10} y={34} textAnchor="end" fill={C.weak} fontSize={13}>
        0x
      </text>
      {HEX.split("").map((h, g) => (
        <text key={g} x={xb(g * 4 + 2)} y={34} textAnchor="middle" fill={C.ink} fontSize={15} fontWeight={600}>
          {h}
        </text>
      ))}
      {i >= 1 &&
        BITS.split("").map((bit, k) => {
          const f = i >= 2 ? FIELDS[fieldOf(k)] : null;
          return (
            <motion.g key={k} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.floor(k / 4) * 0.08 }}>
              <rect x={xb(k)} y={44} width={XW} height={24} fill={f ? f.c : C.fill} fillOpacity={f ? 0.25 : 1} stroke={k % 4 === 0 ? C.lineStrong : C.line} />
              <text x={xb(k) + XW / 2} y={61} textAnchor="middle" fill={C.ink} fontSize={12}>
                {bit}
              </text>
            </motion.g>
          );
        })}
      {i >= 2 &&
        [9, 18, 27, 36].map((k, j) => (
          <motion.line key={k} x1={xb(k)} x2={xb(k)} y1={38} y2={74} stroke={C.ink} strokeWidth={2.5} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + j * 0.25 }} />
        ))}
      {i >= 3 &&
        FIELDS.map((f, k) => (
          <motion.g key={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: k * 0.2 }}>
            <text x={(xb(f.a) + xb(f.b)) / 2} y={92} textAnchor="middle" fill={f.c} fontSize={15} fontWeight={600}>
              {fieldLabel(k)}
            </text>
            <text x={(xb(f.a) + xb(f.b)) / 2} y={108} textAnchor="middle" fill={C.weak} fontSize={12}>
              {f.name}
            </text>
          </motion.g>
        ))}

      {/* rappel des tailles, avant les tables */}
      {i < 4 && (
        <g>
          <rect x={XX} y={130} width={624} height={110} fill={C.fill} stroke={C.line} />
          {[
            "page = 4 Kio = 2^12 → 12 bits de déplacement",
            "table = 4 Kio, entrée = 8 o → 4096 / 8 = 512 = 2^9 → 9 bits par niveau",
            "niveaux = (48 − 12) / 9 = 36 / 9 = 4",
          ].map((t, k) => (
            <text key={k} x={XX + 14} y={160 + k * 28} fill={k === 2 ? C.ink : C.text} fontSize={13}>
              {t}
            </text>
          ))}
        </g>
      )}

      {/* descente dans les 4 tables */}
      {i >= 4 && (
        <g>
          {[0, 1, 2, 3].map((k) => {
            const x = 50 + k * 150;
            const f = FIELDS[k];
            return (
              <motion.g key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.45 }}>
                <line x1={(xb(f.a) + xb(f.b)) / 2} y1={114} x2={x + 50} y2={148} stroke={f.c} strokeDasharray="3 3" />
                <text x={x + 50} y={146} textAnchor="middle" fill={C.weak} fontSize={12} />
                <rect x={x} y={150} width={100} height={110} fill={C.paper} stroke={C.lineStrong} />
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <line key={r} x1={x} y1={150 + 16 + r * 16} x2={x + 100} y2={150 + 16 + r * 16} stroke={C.line} />
                ))}
                <rect x={x} y={198} width={100} height={18} fill={f.c} fillOpacity={0.3} stroke={f.c} />
                <text x={x + 50} y={212} textAnchor="middle" fill={C.ink} fontSize={12}>
                  [{f.v}]
                </text>
                <text x={x + 50} y={278} textAnchor="middle" fill={C.weak} fontSize={12}>
                  table niv. {k + 1}
                </text>
                <line x1={x + 100} y1={207} x2={k < 3 ? x + 148 : 636} y2={k < 3 ? 160 : 207} stroke={f.c} strokeWidth={1.5} markerEnd={`url(#arr-${["blue", "purple", "cyan", "green"][k]})`} />
              </motion.g>
            );
          })}
          <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.9 }}>
            <rect x={640} y={186} width={110} height={42} fill={C.green} fillOpacity={0.15} stroke={C.green} strokeWidth={1.5} />
            <text x={695} y={212} textAnchor="middle" fill={C.ink} fontSize={13}>
              case 0x1A2B3
            </text>
          </motion.g>
        </g>
      )}

      {/* adresse physique */}
      {i >= 5 && (
        <g>
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <text x={XX} y={318} fill={C.red} fontSize={13}>
              0x1A2B3 + 0xE5F
            </text>
            <line x1={XX - 4} y1={314} x2={XX + 124} y2={314} stroke={C.red} strokeWidth={2} />
            <text x={XX + 140} y={318} fill={C.red} fontSize={12}>
              ✗ la case n'est pas une adresse
            </text>
          </motion.g>
          <motion.text x={XX} y={346} fill={C.text} fontSize={14} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            0x1A2B3 × 0x1000 = 0x1A2B3<tspan fill={C.weak}>000</tspan>
            <tspan fill={C.weak} fontSize={12}>
              {"   "}(× 4096 = 12 bits à zéro)
            </tspan>
          </motion.text>
          <motion.text x={XX} y={374} fill={C.ink} fontSize={15} fontWeight={600} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} style={{ whiteSpace: "pre" }}>
            0x1A2B3000 + 0xE5F = 0x1A2B3<tspan fill={C.orange}>E5F</tspan>
          </motion.text>
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 4. TLB et défaut de page
// ---------------------------------------------------------------------------

type TlbMode = "hit" | "miss" | "fault";

const P_CPU = [120, 135];
const P_TLB = [265, 158];
const P_T = [0, 1, 2, 3].map((k) => [490, 72 + k * 46]);
const P_CASE = [571, 140];
const P_DISK = [265, 262];

function Tlb({ mode }: { mode: TlbMode }) {
  const path: number[][] =
    mode === "hit" ? [P_CPU, P_TLB, P_CASE] : mode === "miss" ? [P_CPU, P_TLB, ...P_T, P_TLB, P_CASE] : [P_CPU, P_TLB, ...P_T, P_DISK, P_CASE];
  const reads = mode === "hit" ? 0 : 4;
  const dur = path.length * 0.55;
  return (
    <svg key={mode} viewBox="0 0 720 300" className="w-full max-w-[720px]" role="img" aria-label="TLB, parcours des tables et défaut de page">
      <ArrowMarkers />
      <text x={20} y={34} fill={C.weak} fontSize={12}>
        lectures de tables
      </text>
      <motion.text x={20} y={74} fill={reads ? C.orange : C.green} fontSize={34} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reads ? dur * 0.6 : 0.4 }}>
        {reads}
      </motion.text>

      <rect x={20} y={110} width={100} height={50} fill={C.fill} stroke={C.lineStrong} />
      <text x={70} y={140} textAnchor="middle" fill={C.ink} fontSize={14}>
        CPU
      </text>
      <rect x={200} y={96} width={130} height={86} fill={C.paper} stroke={C.lineStrong} />
      <text x={265} y={118} textAnchor="middle" fill={C.ink} fontSize={14}>
        MMU
      </text>
      <rect x={215} y={142} width={100} height={30} fill={mode === "hit" ? C.green : C.fill} fillOpacity={mode === "hit" ? 0.2 : 1} stroke={mode === "hit" ? C.green : C.lineStrong} />
      <text x={265} y={162} textAnchor="middle" fill={C.ink} fontSize={13}>
        TLB
      </text>
      <text x={265} y={200} textAnchor="middle" fill={C.weak} fontSize={12}>
        {mode === "hit" ? "la traduction y est" : mode === "miss" ? "absente, puis rangée" : "absente"}
      </text>

      <rect x={420} y={20} width={290} height={210} fill="none" stroke={C.line} />
      <text x={430} y={38} fill={C.weak} fontSize={12}>
        mémoire
      </text>
      {P_T.map(([x, y], k) => (
        <g key={k}>
          <rect x={x - 60} y={y - 15} width={120} height={30} fill={C.fill} stroke={mode === "fault" && k === 3 ? C.red : C.lineStrong} />
          <text x={x} y={y + 5} textAnchor="middle" fill={C.text} fontSize={12}>
            {mode === "fault" && k === 3 ? "niv. 4 : P = 0" : `table niv. ${k + 1}`}
          </text>
          {k < 3 && <line x1={x} y1={y + 15} x2={x} y2={y + 31} stroke={C.lineStrong} markerEnd="url(#arr-lineStrong)" />}
        </g>
      ))}
      <rect x={580} y={122} width={110} height={36} fill={C.green} fillOpacity={0.15} stroke={C.green} />
      <text x={635} y={145} textAnchor="middle" fill={C.ink} fontSize={12}>
        case 0x1A2B3
      </text>
      <line x1={120} y1={135} x2={198} y2={150} stroke={C.lineStrong} markerEnd="url(#arr-lineStrong)" />
      <line x1={315} y1={157} x2={576} y2={141} stroke={C.line} strokeDasharray="4 4" />
      <line x1={330} y1={110} x2={438} y2={74} stroke={C.line} strokeDasharray="4 4" />

      {mode === "fault" && (
        <g>
          <rect x={200} y={244} width={130} height={36} fill={C.fill} stroke={C.lineStrong} />
          <text x={265} y={267} textAnchor="middle" fill={C.ink} fontSize={13}>
            disque
          </text>
        </g>
      )}
      <motion.circle
        r={7}
        fill={mode === "fault" ? C.red : C.blue}
        initial={{ cx: P_CPU[0], cy: P_CPU[1] }}
        animate={{ cx: path.map((p) => p[0]), cy: path.map((p) => p[1]) }}
        transition={{ duration: dur, ease: "easeInOut" }}
      />
    </svg>
  );
}

const FAULT_STEPS = [
  "L'entrée finale a P = 0 : défaut de page, le système prend la main.",
  "Il cherche une case libre, sinon une victime.",
  "La victime est recopiée sur disque seulement si elle a été modifiée.",
  "Il charge la page depuis le disque et met la table à jour (P : 0 → 1).",
  "L'instruction fautive est rejouée.",
];

// ---------------------------------------------------------------------------

export default function Pagination() {
  const [page, setPage] = useState(1);
  const [off, setOff] = useState(1000);
  const [mode, setMode] = useState<TlbMode>("hit");
  return (
    <>
      <Section title="L'idée">
        <Idea>Une adresse virtuelle = un numéro de page + un déplacement. La MMU remplace la page par sa case ; le déplacement ne change pas.</Idea>
        <Formula>adresse physique = case × taille de page + déplacement</Formula>
        <p>La MMU est un circuit matériel. Elle lit la table des pages du processus.</p>
        <p>Il y a une table par processus, rangée en mémoire et tenue à jour par le système.</p>
      </Section>

      <Section title="Pages, cases et table des pages">
        <Figure caption="Schéma du cours : 4 pages, 6 cases de 4 Kio. Le point garde le même déplacement dans la page et dans la case. Page 2 : P = 0, pas de case.">
          <div className="space-y-4">
            <Choice label="Page" options={[0, 1, 2, 3]} value={page} onChange={setPage} />
            <Slider label="déplacement" value={off} min={0} max={4095} onChange={setOff} />
            <PagesCases page={page} off={off} />
          </div>
        </Figure>
      </Section>

      <Section title="L'exercice : combien de niveaux ?">
        <p>Adresses virtuelles de 36 bits, pages de 16 Kio, entrées de 8 octets, une table tient exactement dans une page.</p>
        <Stepper steps={NIV_STEPS} interval={2800} caption="Orange : déplacement, recopié tel quel. Bleu et violet : les bits qui choisissent une entrée dans chaque niveau de table.">
          {(i) => <Niveaux i={i} />}
        </Stepper>
      </Section>

      <Section title="Traduire une adresse x86-64">
        <Stepper steps={X86_STEPS} interval={3000} caption="Chaque champ de 9 bits est un indice dans une table de 512 entrées. La dernière table donne la case 0x1A2B3 (donnée de l'exercice).">
          {(i) => <X86 i={i} />}
        </Stepper>
      </Section>

      <Section title="TLB et défaut de page">
        <p>Lire quatre tables à chaque accès coûterait cher. La MMU garde un cache des traductions : la <strong>TLB</strong>.</p>
        <Figure caption="x86-64 : avec la TLB, 0 lecture de table ; sans elle, 4 lectures, puis la traduction est rangée dans la TLB.">
          <div className="space-y-4">
            <Choice
              options={[
                { value: "hit", label: "TLB : succès" },
                { value: "miss", label: "TLB : échec" },
                { value: "fault", label: "défaut de page" },
              ]}
              value={mode}
              onChange={setMode}
            />
            <Tlb mode={mode} />
            {mode === "fault" && (
              <ol className="list-decimal space-y-1 pl-6 font-mono text-[13px]">
                {FAULT_STEPS.map((s, k) => (
                  <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + k * 0.35 }}>
                    {s}
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
        </Figure>
      </Section>

      <Section title="Méthode et pièges">
        <Formula>bits de déplacement = log₂(taille de page)</Formula>
        <Formula>bits par niveau = log₂(taille d'une table / taille d'une entrée)</Formula>
        <Formula>niveaux = (bits d'adresse − bits de déplacement) / bits par niveau</Formula>
        <p className="text-[14px] text-fg-weak">Si la division ne tombe pas juste, on arrondit au-dessus.</p>
        <Trap>
          <p>Diviser toute l'adresse par les bits par niveau : 36 / 11 ≈ 3,3, donc « 4 niveaux ». Faux : les 14 bits de déplacement ne passent par aucune table. (36 − 14) / 11 = 2.</p>
        </Trap>
        <Trap title="Piège de calcul">
          <p>Additionner la case et le déplacement : 0x1A2B3 + 0xE5F. Faux : la case est un numéro, pas une adresse. Il faut 0x1A2B3 × 0x1000 + 0xE5F = 0x1A2B3E5F.</p>
        </Trap>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Adresse virtuelle = numéro de page | déplacement. Le déplacement est recopié tel quel.</li>
          <li>Adresse physique = case × taille de page + déplacement.</li>
          <li>Une table des pages par processus ; la MMU (matériel) traduit chaque accès.</li>
          <li>Exercice du cours : 14 bits de déplacement, 2048 entrées (11 bits), 2 niveaux.</li>
          <li>x86-64 : 48 bits = 9 | 9 | 9 | 9 | 12, donc 4 niveaux.</li>
          <li>TLB = cache des traductions. P = 0 dans l'entrée finale : défaut de page.</li>
        </Points>
        <Reveal question={<p>Adresses de 36 bits, pages de 16 Kio, entrées de 8 o, une table = une page. Bits de déplacement ? Entrées par table ? Niveaux ?</p>}>
          <p>Déplacement : 16 Kio = 2^14, donc <strong>14 bits</strong>.</p>
          <p>Entrées : 2^14 / 2^3 = 2^11 = <strong>2048</strong>, soit 11 bits par niveau.</p>
          <p>
            Niveaux : (36 − 14) / 11 = <strong>2</strong>.
          </p>
        </Reveal>
        <Reveal question={<p>x86-64 : découper 0x7F3A1C2D4E5F. La dernière table donne la case 0x1A2B3. Adresse physique ?</p>}>
          <p>Champs de 9 bits : 254, 232, 225, 212. Déplacement (12 bits) : 0xE5F.</p>
          <p>
            0x1A2B3 × 0x1000 + 0xE5F = <strong>0x1A2B3E5F</strong>.
          </p>
        </Reveal>
        <Reveal question={<p>Que fait le système lors d'un défaut de page ?</p>}>
          <p>Il cherche une case libre, sinon une victime (recopiée sur disque seulement si elle a été modifiée). Il charge la page, met la table à jour (P = 1), puis l'instruction fautive est rejouée.</p>
        </Reveal>
      </Section>
    </>
  );
}
