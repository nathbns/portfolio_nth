"use client";
// Fiche CM6 : caméra sténopé, matrice K, paramètres extrinsèques, calibration par DLT.
// Sources : vidéo iiv-04-camera-calibration (plan.json, video.srt) et README du CM6.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowMarkers,
  C,
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
  type Color,
} from "../kit";

// ---------------------------------------------------------------------------
// Petits outils

type P2 = { x: number; y: number };

/** Arrondi pour les attributs SVG (même texte côté serveur et navigateur). */
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Nombre à la française : virgule décimale, vrai signe moins. */
function fr(x: number, d = 2) {
  const v = Math.abs(x) < 0.5 * 10 ** -d ? 0 : x;
  return v.toFixed(d).replace(".", ",").replace("-", "−");
}
/** Nombre court : entier si possible, sinon d décimales. */
function nb(x: number, d = 1) {
  return Math.abs(x - Math.round(x)) < 1e-9 ? fr(x, 0) : fr(x, d);
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Caméra de l'exemple du cours
const FK = 800; // f·ku = f·kv
const U0 = 320;
const V0 = 240;
/** Pixel d'un point (X, Y, Z) du repère caméra, avec l'obliquité a. */
const project = (X: number, Y: number, Z: number, a = 0) => ({ x: (FK * X + a * Y) / Z + U0, y: (FK * Y) / Z + V0 });

/** Animation pilotée par requestAnimationFrame (les setState se font dans le callback). */
function useTween() {
  const raf = useRef(0);
  useEffect(() => {
    const r = raf;
    return () => cancelAnimationFrame(r.current);
  }, []);
  return useCallback((ms: number, frame: (t: number) => void) => {
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      frame(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);
}

function Play({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row border border-line px-3 py-1 font-mono text-[13px] text-fg-weak hover:text-fg-strong"
    >
      ▶ {children}
    </button>
  );
}

/** Texte SVG avec un halo couleur du fond, lisible par-dessus les traits. */
function T({
  x,
  y,
  children,
  color = C.ink,
  size = 13,
  anchor = "start",
  weight,
}: {
  x: number;
  y: number;
  children: ReactNode;
  color?: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text
      x={r2(x)}
      y={r2(y)}
      fill={color}
      fontSize={size}
      textAnchor={anchor}
      fontWeight={weight}
      stroke={C.paper}
      strokeWidth={4}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {children}
    </text>
  );
}

function Arrow({ from, to, color, width = 2, dash }: { from: P2; to: P2; color: Color; width?: number; dash?: string }) {
  return (
    <line
      x1={r2(from.x)}
      y1={r2(from.y)}
      x2={r2(to.x)}
      y2={r2(to.y)}
      stroke={C[color]}
      strokeWidth={width}
      strokeDasharray={dash}
      markerEnd={`url(#arr-${color})`}
    />
  );
}

/** Matrice dessinée avec ses crochets. */
function Matrix({
  x,
  y,
  rows,
  cw = 56,
  rh = 28,
  color = C.ink,
  size = 14,
}: {
  x: number;
  y: number;
  rows: ReactNode[][];
  cw?: number;
  rh?: number;
  color?: string;
  size?: number;
}) {
  const w = rows[0].length * cw;
  const h = rows.length * rh;
  return (
    <g>
      <path d={`M ${x + 7} ${y} L ${x} ${y} L ${x} ${y + h} L ${x + 7} ${y + h}`} fill="none" stroke={C.ink} strokeWidth={1.5} />
      <path d={`M ${x + w - 7} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x + w - 7} ${y + h}`} fill="none" stroke={C.ink} strokeWidth={1.5} />
      {rows.map((r, i) =>
        r.map((v, j) => (
          <text key={`${i}-${j}`} x={x + cw * (j + 0.5)} y={y + rh * (i + 0.5) + 5} textAnchor="middle" fill={color} fontSize={size}>
            {v}
          </text>
        )),
      )}
    </g>
  );
}

/** Capteur 640 × 480 réduit d'un facteur s, grille tous les 80 pixels, origine en haut à gauche. */
function Sensor({ x, y, s, grid = true }: { x: number; y: number; s: number; grid?: boolean }) {
  const cx = x + U0 * s;
  const cy = y + V0 * s;
  return (
    <g>
      <rect x={x} y={y} width={r2(640 * s)} height={r2(480 * s)} fill={C.fill} stroke={C.lineStrong} strokeWidth={1.5} />
      {grid &&
        Array.from({ length: 7 }, (_, k) => (
          <line key={`v${k}`} x1={r2(x + (k + 1) * 80 * s)} y1={y} x2={r2(x + (k + 1) * 80 * s)} y2={r2(y + 480 * s)} stroke={C.line} strokeWidth={0.8} />
        ))}
      {grid &&
        Array.from({ length: 5 }, (_, k) => (
          <line key={`h${k}`} x1={x} y1={r2(y + (k + 1) * 80 * s)} x2={r2(x + 640 * s)} y2={r2(y + (k + 1) * 80 * s)} stroke={C.line} strokeWidth={0.8} />
        ))}
      <line x1={r2(cx - 6)} y1={r2(cy)} x2={r2(cx + 6)} y2={r2(cy)} stroke={C.weak} strokeWidth={1.5} />
      <line x1={r2(cx)} y1={r2(cy - 6)} x2={r2(cx)} y2={r2(cy + 6)} stroke={C.weak} strokeWidth={1.5} />
    </g>
  );
}

/** Petite caméra vue de côté qui regarde vers +Z (la droite) ; (x, y) = centre optique. */
function SideCam({ x, y }: P2) {
  return (
    <g>
      <rect x={r2(x - 34)} y={r2(y - 11)} width={22} height={22} rx={2} fill={C.fill2} stroke={C.ink} strokeWidth={1.5} />
      <path d={`M ${r2(x - 12)} ${r2(y - 6)} L ${r2(x)} ${r2(y - 12)} L ${r2(x)} ${r2(y + 12)} L ${r2(x - 12)} ${r2(y + 6)} Z`} fill={C.fill2} stroke={C.ink} strokeWidth={1.5} />
      <circle cx={r2(x)} cy={r2(y)} r={3.5} fill={C.ink} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1. Le sténopé : y = f·Y/Z (vue de côté)

function PinholeFig() {
  const [Z, setZ] = useState(4);
  const [f, setF] = useState(1);
  const tween = useTween();
  const Y = 0.5;
  const O = { x: 70, y: 214 };
  const sz = 95;
  const sy = 220;
  const xf = O.x + sz * f;
  const xP = O.x + sz * Z;
  const yP = O.y - sy * Y;
  const yImg = (f * Y) / Z;
  const yI = O.y - sy * yImg;
  return (
    <Figure caption="Triangles semblables : y / f = Y / Z, donc y = f·Y/Z (et x = f·X/Z). Quand le point s'éloigne (Z augmente), son image glisse vers le centre du plan image. Échelles horizontale et verticale différentes pour la lisibilité.">
      <div className="space-y-3">
        <svg viewBox="0 0 860 290" className="w-full max-w-[860px]" role="img" aria-label="Modèle sténopé vu de côté : projection d'un point sur le plan image">
          <ArrowMarkers />
          <polygon points={`${O.x},${O.y} ${r2(xP)},${O.y} ${r2(xP)},${r2(yP)}`} fill={C.orange} fillOpacity={0.1} />
          <polygon points={`${O.x},${O.y} ${r2(xf)},${O.y} ${r2(xf)},${r2(yI)}`} fill={C.blue} fillOpacity={0.25} />
          <Arrow from={{ x: 40, y: O.y }} to={{ x: 850, y: O.y }} color="lineStrong" width={1.5} />
          <T x={846} y={O.y - 10} anchor="end" color={C.text}>
            Z
          </T>
          <Arrow from={{ x: O.x, y: O.y + 30 }} to={{ x: O.x, y: 70 }} color="lineStrong" width={1.5} />
          <T x={O.x - 10} y={80} anchor="end" color={C.text}>
            Y
          </T>
          {/* plan image */}
          <line x1={r2(xf)} y1={O.y - 150} x2={r2(xf)} y2={O.y + 40} stroke={C.blue} strokeWidth={3} />
          <T x={xf} y={O.y - 158} anchor="middle" color={C.blue} size={12.5}>
            plan image
          </T>
          {/* rayon */}
          <line x1={O.x} y1={O.y} x2={r2(xP)} y2={r2(yP)} stroke={C.red} strokeWidth={2} />
          <circle cx={r2(xP)} cy={r2(yP)} r={6} fill={C.red} />
          <T x={xP - 10} y={yP - 12} anchor="end" color={C.red} weight={600}>
            P (Y = 0,5 ; Z = {fr(Z, 1)})
          </T>
          <circle cx={r2(xf)} cy={r2(yI)} r={5} fill={C.red} stroke={C.paper} strokeWidth={1.5} />
          <circle cx={O.x} cy={O.y} r={5} fill={C.ink} />
          <T x={O.x + 6} y={O.y + 22} color={C.ink} size={12.5}>
            C
          </T>
          {/* cotes */}
          <line x1={O.x} y1={O.y + 52} x2={r2(xf)} y2={O.y + 52} stroke={C.blue} strokeWidth={1.5} />
          <line x1={r2(xf)} y1={O.y + 46} x2={r2(xf)} y2={O.y + 58} stroke={C.blue} strokeWidth={1.5} />
          <T x={(O.x + xf) / 2} y={O.y + 47} anchor="middle" color={C.blue} weight={600}>
            f
          </T>
          <line x1={O.x} y1={O.y + 70} x2={r2(xP)} y2={O.y + 70} stroke={C.orange} strokeWidth={1.5} />
          <line x1={O.x} y1={O.y + 64} x2={O.x} y2={O.y + 76} stroke={C.orange} strokeWidth={1.5} />
          <line x1={r2(xP)} y1={O.y + 64} x2={r2(xP)} y2={O.y + 76} stroke={C.orange} strokeWidth={1.5} />
          <T x={(O.x + xP) / 2} y={O.y + 66} anchor="middle" color={C.orange} weight={600}>
            Z
          </T>
          <line x1={r2(xP + 16)} y1={O.y} x2={r2(xP + 16)} y2={r2(yP)} stroke={C.orange} strokeWidth={1.5} />
          <T x={Math.min(xP + 22, 846)} y={(O.y + yP) / 2 + 4} anchor={xP + 40 > 846 ? "end" : "start"} color={C.orange} weight={600}>
            Y
          </T>
          <T x={xf + 10} y={(O.y + yI) / 2 + 5} color={C.blue} weight={600}>
            y
          </T>
          {/* lecture */}
          <T x={846} y={30} anchor="end" color={C.ink} size={14} weight={600}>
            {`y = f·Y/Z = ${fr(f)} × 0,5 / ${fr(Z, 1)} = ${fr(yImg, 3)}`}
          </T>
          <T x={846} y={54} anchor="end" color={C.text} size={12.5}>
            (x, y) = (f·X/Z, f·Y/Z), avec Z &gt; 0
          </T>
        </svg>
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          <Slider label="Profondeur Z" value={Z} min={2} max={8} step={0.1} onChange={setZ} format={(v) => fr(v, 1)} />
          <Slider label="Focale f" value={f} min={0.5} max={2} step={0.05} onChange={setF} format={(v) => fr(v)} />
        </div>
        <Play onClick={() => tween(3000, (t) => setZ(Math.round((2 + 6 * ease(t)) * 10) / 10))}>éloigner le point (Z de 2 à 8)</Play>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 2. Tous les points d'un rayon donnent le même pixel

function RayFig() {
  const [s, setS] = useState(1);
  const tween = useTween();
  const O = { x: 50, y: 205 };
  const sz = 55;
  const sy = 110;
  const at = (Z: number, Y: number) => ({ x: O.x + sz * Z, y: O.y - sy * Y });
  const P = at(4 * s, 0.5 * s);
  const px = project(s, 0.5 * s, 4 * s);
  const SX = 580;
  const SY = 40;
  const SS = 0.4;
  const pix = { x: SX + SS * px.x, y: SY + SS * px.y };
  const ghosts = [0.5, 1, 2];
  const far = at(8.6, 8.6 / 8);
  return (
    <Figure caption="P = s·(1 ; 0,5 ; 4) glisse sur le rayon qui passe par le centre optique : son pixel reste (520, 340). Une seule image ne donne donc pas la profondeur.">
      <div className="space-y-3">
        <svg viewBox="0 0 860 260" className="w-full max-w-[860px]" role="img" aria-label="Points d'un même rayon projetés sur le même pixel">
          <ArrowMarkers />
          <Sensor x={SX} y={SY} s={SS} />
          <line x1={30} y1={O.y} x2={540} y2={O.y} stroke={C.lineStrong} strokeWidth={1.2} />
          <T x={536} y={O.y + 20} anchor="end" color={C.text} size={12.5}>
            Z
          </T>
          <line x1={O.x} y1={O.y} x2={r2(far.x)} y2={r2(far.y)} stroke={C.red} strokeWidth={1.5} strokeDasharray="6 4" />
          {ghosts.map((g) => {
            const q = at(4 * g, 0.5 * g);
            return (
              <g key={g}>
                <line x1={r2(q.x)} y1={r2(q.y)} x2={r2(pix.x)} y2={r2(pix.y)} stroke={C.weak} strokeWidth={1} strokeDasharray="2 5" />
                <circle cx={r2(q.x)} cy={r2(q.y)} r={5} fill="none" stroke={C.weak} strokeWidth={1.5} />
                <T x={q.x + 4} y={q.y + 22} anchor="middle" color={C.weak} size={12}>
                  {`s = ${fr(g, g === 0.5 ? 1 : 0)}`}
                </T>
              </g>
            );
          })}
          <SideCam x={O.x} y={O.y} />
          <circle cx={r2(P.x)} cy={r2(P.y)} r={7} fill={C.red} />
          <T x={P.x - 10} y={P.y - 14} anchor="middle" color={C.red} weight={600}>
            P
          </T>
          <T x={20} y={30} color={C.ink} size={13.5} weight={600}>
            {`P = (${fr(s)} ; ${fr(0.5 * s)} ; ${fr(4 * s)})`}
          </T>
          <T x={20} y={54} color={C.text} size={12.5}>
            {`pixel = (800·X/Z + 320 ; 800·Y/Z + 240) = (${nb(px.x)} ; ${nb(px.y)})`}
          </T>
          <T x={SX} y={SY - 10} color={C.text} size={12.5}>
            capteur 640 × 480
          </T>
          <circle cx={r2(pix.x)} cy={r2(pix.y)} r={6} fill={C.red} />
          <T x={pix.x - 8} y={pix.y + 22} anchor="middle" color={C.red} size={12.5} weight={600}>
            (520, 340)
          </T>
        </svg>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[260px] flex-1">
            <Slider label="Position s" value={s} min={0.5} max={2} step={0.01} onChange={setS} format={(v) => fr(v)} />
          </div>
          <Play onClick={() => tween(3000, (t) => setS(Math.round((0.5 + 1.5 * ease(t)) * 100) / 100))}>glisser</Play>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 3. Du plan image au capteur : K, centre (u0, v0), obliquité a

function SensorFig() {
  const [X, setX] = useState(1);
  const [Y, setY] = useState(0.5);
  const [Z, setZ] = useState(4);
  const [a, setA] = useState(0);
  const SX = 40;
  const SY = 44;
  const S = 0.6;
  const toS = (p: P2) => ({ x: SX + S * p.x, y: SY + S * p.y });
  const px = project(X, Y, Z, a);
  const inside = px.x >= 0 && px.x <= 640 && px.y >= 0 && px.y <= 480;
  const c = toS({ x: U0, y: V0 });
  const p = toS(px);
  // grille du plan image (pas de 80 pixels quand a = 0), cisaillée par l'obliquité a
  const vlines = Array.from({ length: 9 }, (_, k) => {
    const xn = (80 * k - U0) / FK;
    const top = { x: FK * xn + (a * (0 - V0)) / FK + U0, y: 0 };
    const bot = { x: FK * xn + (a * (480 - V0)) / FK + U0, y: 480 };
    return [toS(top), toS(bot)];
  });
  return (
    <Figure caption="Le capteur compte en pixels : ku et kv pixels par unité de longueur, origine (0, 0) en haut à gauche, y vers le bas, centre de l'image en (u0, v0) = (320, 240). L'obliquité a cisaille la grille (pixels non rectangulaires) ; en général a ≈ 0.">
      <div className="space-y-3">
        <svg viewBox="0 0 860 350" className="w-full max-w-[860px]" role="img" aria-label="Capteur en pixels, centre de l'image et matrice K">
          <ArrowMarkers />
          <defs>
            <clipPath id="calib-sensor-clip">
              <rect x={SX} y={SY} width={640 * S} height={480 * S} />
            </clipPath>
          </defs>
          <Sensor x={SX} y={SY} s={S} grid={false} />
          <g clipPath="url(#calib-sensor-clip)">
            {vlines.map(([t, b], k) => (
              <line key={k} x1={r2(t.x)} y1={r2(t.y)} x2={r2(b.x)} y2={r2(b.y)} stroke={C.line} strokeWidth={1} />
            ))}
            {Array.from({ length: 5 }, (_, k) => (
              <line key={`h${k}`} x1={SX} y1={SY + (k + 1) * 80 * S} x2={SX + 640 * S} y2={SY + (k + 1) * 80 * S} stroke={C.line} strokeWidth={1} />
            ))}
          </g>
          <Arrow from={{ x: SX, y: SY - 14 }} to={{ x: SX + 90, y: SY - 14 }} color="text" width={1.5} />
          <T x={SX + 96} y={SY - 10} color={C.text} size={12.5}>
            x
          </T>
          <Arrow from={{ x: SX - 14, y: SY }} to={{ x: SX - 14, y: SY + 90 }} color="text" width={1.5} />
          <T x={SX - 18} y={SY + 108} anchor="middle" color={C.text} size={12.5}>
            y
          </T>
          <T x={SX + 6} y={SY + 16} color={C.weak} size={12}>
            (0, 0)
          </T>
          <T x={c.x - 8} y={c.y + 20} anchor="end" color={C.weak} size={12}>
            (u0, v0)
          </T>
          {inside && <Arrow from={c} to={p} color="red" width={2} />}
          {inside && <circle cx={r2(p.x)} cy={r2(p.y)} r={6} fill={C.red} />}
          {inside && (
            <T x={p.x} y={p.y + (p.y > SY + 250 ? -14 : 24)} anchor={p.x > SX + 300 ? "end" : "middle"} color={C.red} weight={600}>
              {`(${nb(px.x)}, ${nb(px.y)})`}
            </T>
          )}
          {!inside && (
            <T x={SX + 192} y={SY + 300} anchor="middle" color={C.red} weight={600}>
              {`pixel (${nb(px.x)}, ${nb(px.y)}) : hors du capteur`}
            </T>
          )}
          <T x={SX + 192} y={SY + 318} anchor="middle" color={C.text} size={12}>
            capteur 640 × 480 (une case = 80 pixels)
          </T>
          {/* K et les équations */}
          <T x={490} y={40} color={C.ink} size={14} weight={600}>
            K =
          </T>
          <Matrix
            x={530}
            y={20}
            cw={60}
            rows={[
              ["800", <tspan key="a" fill={C.purple} fontWeight={600}>{nb(a, 0)}</tspan>, "320"],
              ["0", "800", "240"],
              ["0", "0", "1"],
            ]}
          />
          <T x={490} y={128} color={C.weak} size={12}>
            = [[f·ku, a, u0], [0, f·kv, v0], [0, 0, 1]]
          </T>
          <T x={490} y={172} color={C.text} size={13}>
            {`P = (${fr(X)} ; ${fr(Y)} ; ${fr(Z, 1)}) (repère caméra)`}
          </T>
          <T x={490} y={206} color={C.ink} size={13.5}>
            x_S = (f·ku·X + a·Y)/Z + u0
          </T>
          <T x={520} y={230} color={C.red} size={13.5} weight={600}>
            {`= (800·${fr(X)} + ${nb(a, 0)}·${fr(Y)})/${fr(Z, 1)} + 320 = ${nb(px.x)}`}
          </T>
          <T x={490} y={264} color={C.ink} size={13.5}>
            y_S = f·kv·Y/Z + v0
          </T>
          <T x={520} y={288} color={C.red} size={13.5} weight={600}>
            {`= 800·${fr(Y)}/${fr(Z, 1)} + 240 = ${nb(px.y)}`}
          </T>
        </svg>
        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
          <Slider label="X" value={X} min={-1} max={1} step={0.05} onChange={setX} format={(v) => fr(v)} />
          <Slider label="Y" value={Y} min={-0.8} max={0.8} step={0.05} onChange={setY} format={(v) => fr(v)} />
          <Slider label="Z" value={Z} min={2} max={8} step={0.1} onChange={setZ} format={(v) => fr(v, 1)} />
          <Slider label="Obliquité a" value={a} min={0} max={200} step={5} onChange={setA} format={(v) => String(v)} />
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 4. K·P en coordonnées homogènes, pas à pas

const K_STEPS = [
  "K et P = (1 ; 0,5 ; 4) dans le repère caméra",
  "Chaque ligne de K multiplie P",
  "K·P = (2080 ; 1360 ; 4)",
  "On divise par la 3e composante : (520 ; 340 ; 1)",
  "« ~ » : égal à un facteur près (coordonnées homogènes)",
];

function KStepper() {
  return (
    <Stepper steps={K_STEPS} interval={2400}>
      {(i) => (
        <svg viewBox="0 0 860 200" className="w-full max-w-[860px]" role="img" aria-label="Produit de K par P puis division par la troisième composante">
          <ArrowMarkers />
          <Matrix
            x={20}
            y={40}
            cw={56}
            rh={30}
            rows={[
              ["800", "0", "320"],
              ["0", "800", "240"],
              ["0", "0", "1"],
            ]}
          />
          <T x={104} y={160} anchor="middle" color={C.weak} size={12.5}>
            K
          </T>
          <T x={200} y={90} anchor="middle" color={C.ink} size={16}>
            ·
          </T>
          <Matrix x={214} y={40} cw={56} rh={30} color={C.blue} rows={[["1"], ["0,5"], ["4"]]} />
          <T x={242} y={160} anchor="middle" color={C.weak} size={12.5}>
            P
          </T>
          {i >= 1 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <T x={292} y={90} anchor="middle" color={C.ink} size={16}>
                =
              </T>
              <Matrix
                x={310}
                y={40}
                cw={i === 1 ? 250 : 110}
                rh={30}
                size={i === 1 ? 13 : 15}
                color={C.orange}
                rows={i === 1 ? [["800·1 + 0·0,5 + 320·4"], ["0·1 + 800·0,5 + 240·4"], ["0·1 + 0·0,5 + 1·4"]] : [["2080"], ["1360"], ["4"]]}
              />
              <T x={i === 1 ? 435 : 365} y={160} anchor="middle" color={C.weak} size={12.5}>
                K·P
              </T>
            </motion.g>
          )}
          {i >= 3 && (
            <motion.g initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <line x1={440} y1={85} x2={540} y2={85} stroke={C.text} strokeWidth={1.5} markerEnd="url(#arr-text)" />
              <T x={490} y={74} anchor="middle" color={C.text} size={13}>
                ÷ 4
              </T>
              <Matrix x={560} y={40} cw={90} rh={30} size={15} color={C.red} rows={[["520"], ["340"], ["1"]]} />
              <T x={605} y={160} anchor="middle" color={C.weak} size={12.5}>
                pixel
              </T>
            </motion.g>
          )}
          {i >= 4 && (
            <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <T x={680} y={80} color={C.ink} size={14} weight={600}>
                K·P ~ (520 ; 340 ; 1)
              </T>
              <T x={680} y={104} color={C.text} size={12.5}>
                défini à un facteur près
              </T>
              <T x={20} y={192} color={C.purple} size={13}>
                K porte 5 paramètres intrinsèques : f·ku, f·kv, u0, v0, a
              </T>
            </motion.g>
          )}
        </svg>
      )}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 5. Les extrinsèques : la caméra recule

function ExtrinsicFig() {
  const [d, setD] = useState(0);
  const tween = useTween();
  const O = { x: 300, y: 205 };
  const sz = 50;
  const sy = 120;
  const at = (Z: number, Y: number) => ({ x: O.x + sz * Z, y: O.y - sy * Y });
  const P = at(4, 0.5);
  const cam = at(-d, 0);
  const pc = 4 + d;
  const px = project(1, 0.5, pc);
  const SX = 552;
  const SY = 40;
  const SS = 0.45;
  const pix = { x: SX + SS * px.x, y: SY + SS * px.y };
  const pix0 = { x: SX + SS * 520, y: SY + SS * 340 };
  return (
    <Figure caption="R = identité, t_C = (0 ; 0 ; −d) : la caméra recule de d le long de son axe. p_C = Rᵀ(p_W − t_C) = (1 ; 0,5 ; 4 + d). Le pixel glisse de (520, 340) vers le centre (320, 240) : (420, 290) pour d = 4.">
      <div className="space-y-3">
        <svg viewBox="0 0 860 290" className="w-full max-w-[860px]" role="img" aria-label="Caméra qui recule dans le repère du monde et pixel qui se rapproche du centre">
          <ArrowMarkers />
          <Arrow from={{ x: 40, y: O.y }} to={{ x: 530, y: O.y }} color="lineStrong" width={1.5} />
          <T x={526} y={O.y + 20} anchor="end" color={C.text} size={12.5}>
            Z
          </T>
          <Arrow from={{ x: O.x, y: O.y + 20 }} to={{ x: O.x, y: 70 }} color="lineStrong" width={1.5} />
          <T x={O.x + 8} y={80} color={C.text} size={12.5}>
            Y
          </T>
          <T x={O.x + 6} y={O.y + 22} color={C.text} size={12}>
            O (monde)
          </T>
          {d > 0.15 && <Arrow from={{ x: O.x, y: O.y + 44 }} to={{ x: cam.x, y: O.y + 44 }} color="purple" width={2} />}
          {d > 0.15 && (
            <T x={(O.x + cam.x) / 2} y={O.y + 66} anchor="middle" color={C.purple} size={12.5} weight={600}>
              {`t_C = (0 ; 0 ; −${nb(d, 2)})`}
            </T>
          )}
          <line x1={r2(cam.x)} y1={r2(cam.y)} x2={r2(P.x)} y2={r2(P.y)} stroke={C.red} strokeWidth={1.5} strokeDasharray="6 4" />
          <SideCam x={cam.x} y={cam.y} />
          <circle cx={r2(P.x)} cy={r2(P.y)} r={7} fill={C.red} />
          <T x={P.x + 8} y={P.y - 14} anchor="end" color={C.red} weight={600}>
            p_W = (1 ; 0,5 ; 4)
          </T>
          <T x={20} y={30} color={C.ink} size={13.5} weight={600}>
            {`p_C = Rᵀ (p_W − t_C) = (1 ; 0,5 ; ${nb(pc, 2)})`}
          </T>
          <T x={20} y={54} color={C.text} size={12.5}>
            {`pixel = (800·1/${nb(pc, 2)} + 320 ; 800·0,5/${nb(pc, 2)} + 240)`}
          </T>
          <Sensor x={SX} y={SY} s={SS} />
          <T x={SX} y={SY - 10} color={C.text} size={12.5}>
            capteur
          </T>
          <T x={SX + 320 * SS + 8} y={SY + 240 * SS - 8} color={C.weak} size={12}>
            (320, 240)
          </T>
          {d > 0.15 && <circle cx={r2(pix0.x)} cy={r2(pix0.y)} r={5} fill="none" stroke={C.weak} strokeWidth={1.5} strokeDasharray="2 2" />}
          <circle cx={r2(pix.x)} cy={r2(pix.y)} r={6} fill={C.red} />
          <T x={pix.x} y={SY + 480 * SS + 22} anchor="middle" color={C.red} weight={600}>
            {`(${nb(px.x)}, ${nb(px.y)})`}
          </T>
        </svg>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[260px] flex-1">
            <Slider label="Recul d de la caméra" value={d} min={0} max={4} step={0.05} onChange={setD} format={(v) => fr(v)} />
          </div>
          <Play onClick={() => tween(3000, (t) => setD(Math.round(4 * ease(t) * 100) / 100))}>reculer</Play>
        </div>
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------
// 6. La DLT pas à pas

const DLT_P: [number, number, number][] = [
  [0, 0, 4],
  [1, 0, 4],
  [0, 1, 4],
  [1, 1, 5],
  [-1, 0.5, 6],
  [0.5, -0.5, 3],
];
const DLT_PIX = DLT_P.map(([X, Y, Z]) => project(X, Y, Z));
const PAIR_COLORS: Color[] = ["blue", "green", "orange", "purple", "cyan", "red"];
/** Vue oblique schématique des points 3D (X à droite, Y en haut, Z en profondeur vers le haut à gauche). */
const obl = ([X, Y, Z]: [number, number, number]) => ({ x: 220 + 80 * X - 40 * (Z - 4), y: 170 - 80 * Y - 30 * (Z - 4) });
const LABEL_OFF: [number, number, "start" | "end" | "middle"][] = [
  [-10, 18, "end"],
  [10, 18, "start"],
  [-10, -8, "end"],
  [10, -8, "start"],
  [0, -12, "middle"],
  [10, 4, "start"],
];
const DLT_STEPS = [
  "Objet de référence : 6 points 3D connus",
  "Inconnue : H̃ = K̃ M̃, 3 × 4 = 12 coefficients",
  "Paire 1 : 2 équations linéaires en h",
  "Paire 2 : A a 4 lignes",
  "Paire 3 : A a 6 lignes",
  "Paire 4 : A a 8 lignes",
  "Paire 5 : A a 10 lignes",
  "Paire 6 : 12 équations ≥ 11 inconnues",
  "A h = 0 avec ‖h‖ = 1, points non coplanaires",
  "Bloc gauche de H̃ = K Rᵀ → QR → K et R, puis t_C",
];

function DLTStepper() {
  return (
    <Stepper steps={DLT_STEPS} interval={2000}>
      {(i) => {
        const n = i < 2 ? 0 : Math.min(6, i - 1);
        const SX = 560;
        const SY = 28;
        const SS = 0.42;
        const pix = DLT_PIX.map((p) => ({ x: SX + SS * p.x, y: SY + SS * p.y }));
        const pts = DLT_P.map(obl);
        const plane = [obl([-0.4, -0.4, 4]), obl([1.4, -0.4, 4]), obl([1.4, 1.4, 4]), obl([-0.4, 1.4, 4])];
        const AX = 470;
        const AY = 290;
        const cw = 15;
        const rh = 12.5;
        return (
          <svg viewBox="0 0 860 492" className="w-full max-w-[860px]" role="img" aria-label="Construction de la matrice A de la DLT, deux lignes par paire de points">
            {i >= 8 && (
              <motion.polygon
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                points={plane.map((q) => `${r2(q.x)},${r2(q.y)}`).join(" ")}
                fill={C.blue}
                fillOpacity={0.1}
                stroke={C.blue}
                strokeDasharray="4 4"
              />
            )}
            <Sensor x={SX} y={SY} s={SS} />
            {/* traits point 3D → pixel */}
            {pts.slice(0, n).map((q, k) => (
              <motion.line
                key={`l${k}`}
                x1={r2(q.x)}
                y1={r2(q.y)}
                x2={r2(pix[k].x)}
                y2={r2(pix[k].y)}
                stroke={C[PAIR_COLORS[k]]}
                strokeWidth={1.4}
                strokeDasharray="5 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ duration: 0.6 }}
              />
            ))}
            {pts.map((q, k) => {
              const [X, Y, Z] = DLT_P[k];
              const off = LABEL_OFF[k];
              const offPlane = i >= 8 && Z !== 4;
              return (
                <g key={k}>
                  <circle cx={r2(q.x)} cy={r2(q.y)} r={offPlane ? 7 : 5.5} fill={k < n ? C[PAIR_COLORS[k]] : C.ink} stroke={offPlane ? C.ink : "none"} strokeWidth={2} />
                  <T x={q.x + off[0]} y={q.y + off[1]} anchor={off[2]} color={C.text} size={12}>
                    {`(${nb(X)} ; ${nb(Y)} ; ${nb(Z)})`}
                  </T>
                </g>
              );
            })}
            <T x={30} y={24} color={C.weak} size={12}>
              points 3D (vue oblique schématique)
            </T>
            {i >= 8 && (
              <T x={30} y={250} color={C.blue} size={12.5} weight={600}>
                3 points dans le plan Z = 4, 3 en dehors : non coplanaires
              </T>
            )}
            <T x={SX} y={SY + 480 * SS + 18} color={C.weak} size={12}>
              pixels mesurés (capteur 640 × 480)
            </T>
            {pix.slice(0, n).map((q, k) => (
              <motion.circle
                key={`p${k}`}
                cx={r2(q.x)}
                cy={r2(q.y)}
                r={5}
                fill={C[PAIR_COLORS[k]]}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              />
            ))}
            {/* H̃ et les équations */}
            {i >= 1 && i <= 8 && (
              <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <T x={30} y={290} color={C.ink} size={13.5} weight={600}>
                  H̃ = K̃ M̃ (3 × 4)
                </T>
                <Matrix
                  x={56}
                  y={302}
                  cw={44}
                  rh={24}
                  size={13}
                  rows={[
                    ["h11", "h12", "h13", "h14"],
                    ["h21", "h22", "h23", "h24"],
                    ["h31", "h32", "h33", "h34"],
                  ]}
                />
                {["h1", "h2", "h3"].map((h, k) => (
                  <T key={h} x={46} y={302 + 24 * k + 17} anchor="end" color={C.weak} size={12}>
                    {h}
                  </T>
                ))}
              </motion.g>
            )}
            {i >= 2 && i <= 7 && (
              <motion.g key="eq" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <T x={250} y={316} color={C.ink} size={13}>
                  x_S (h3·p̃) − h1·p̃ = 0
                </T>
                <T x={250} y={340} color={C.ink} size={13}>
                  y_S (h3·p̃) − h2·p̃ = 0
                </T>
                <T x={250} y={366} color={C.weak} size={12}>
                  p̃ = (X, Y, Z, 1)
                </T>
              </motion.g>
            )}
            {i === 8 && (
              <motion.g key="ah" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <T x={250} y={320} color={C.ink} size={14} weight={600}>
                  A h = 0, avec ‖h‖ = 1
                </T>
                <T x={250} y={346} color={C.text} size={12.5}>
                  h (12 valeurs) → H̃ (3 × 4)
                </T>
              </motion.g>
            )}
            {i === 9 && (
              <motion.g key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <T x={30} y={290} color={C.ink} size={13.5} weight={600}>
                  H̃ = [ K Rᵀ | −K Rᵀ t_C ]
                </T>
                <rect x={56} y={302} width={132} height={72} fill={C.blue} fillOpacity={0.14} stroke={C.blue} />
                <rect x={188} y={302} width={44} height={72} fill={C.fill2} stroke={C.line} />
                <T x={122} y={343} anchor="middle" color={C.blue} size={14} weight={600}>
                  K Rᵀ
                </T>
                <T x={210} y={343} anchor="middle" color={C.text} size={12}>
                  −K Rᵀ t_C
                </T>
                <T x={30} y={404} color={C.ink} size={13}>
                  décomposition QR → K (triangulaire sup.) et R (rotation)
                </T>
                <T x={30} y={428} color={C.ink} size={13}>
                  dernière colonne → t_C
                </T>
              </motion.g>
            )}
            {/* la matrice A */}
            <T x={AX} y={AY - 12} color={C.ink} size={13.5} weight={600}>
              A (2N × 12)
            </T>
            <rect x={AX} y={AY} width={12 * cw} height={12 * rh} fill="none" stroke={C.line} strokeDasharray="3 4" />
            {Array.from({ length: 2 * n }, (_, r) => {
              const k = Math.floor(r / 2);
              const first = r % 2 === 0;
              return (
                <motion.g key={r} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: first ? 0.2 : 0.35 }}>
                  {Array.from({ length: 12 }, (_, cIdx) => {
                    const grp = Math.floor(cIdx / 4);
                    const on = grp === 2 || (first ? grp === 0 : grp === 1);
                    return (
                      <rect
                        key={cIdx}
                        x={AX + cIdx * cw + 0.5}
                        y={r2(AY + r * rh + 0.5)}
                        width={cw - 1}
                        height={rh - 1}
                        fill={on ? C[PAIR_COLORS[k]] : C.fill2}
                        fillOpacity={on ? (grp === 2 ? 0.4 : 0.8) : 1}
                      />
                    );
                  })}
                </motion.g>
              );
            })}
            <T x={AX + 2 * cw} y={AY + 12 * rh + 18} anchor="middle" color={C.weak} size={11.5}>
              p̃ᵀ
            </T>
            <T x={AX + 6 * cw} y={AY + 12 * rh + 18} anchor="middle" color={C.weak} size={11.5}>
              0ᵀ
            </T>
            <T x={AX + 10 * cw} y={AY + 12 * rh + 18} anchor="middle" color={C.weak} size={11.5}>
              −x_S p̃ᵀ
            </T>
            <T x={AX} y={AY + 12 * rh + 40} color={C.weak} size={11.5}>
              par paire : [p̃ᵀ 0ᵀ −x_S p̃ᵀ] puis [0ᵀ p̃ᵀ −y_S p̃ᵀ]
            </T>
            <T x={700} y={AY + 20} color={C.ink} size={14} weight={600}>
              {`équations : ${2 * n}`}
            </T>
            <T x={700} y={AY + 46} color={C.ink} size={14}>
              inconnues : 11
            </T>
            <T x={700} y={AY + 66} color={C.weak} size={11.5}>
              (12 à un facteur près)
            </T>
            {n === 6 && (
              <T x={700} y={AY + 96} color={C.green} size={14} weight={600}>
                12 ≥ 11 ✓
              </T>
            )}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 7. Affiner : l'erreur de reprojection

const NOISE: [number, number][] = [
  [1.5, -0.8],
  [-1.2, 0.9],
  [0.6, 1.4],
  [-0.9, -1.1],
  [1.1, 0.4],
  [-0.5, -1.3],
];
const OFFSET: [number, number][] = [
  [12, -8],
  [-10, 6],
  [8, 10],
  [-6, -12],
  [10, 4],
  [-8, -6],
];
const MEASURED = DLT_PIX.map((p, k) => ({ x: p.x + NOISE[k][0], y: p.y + NOISE[k][1] }));
const ERR = Array.from({ length: 6 }, (_, k) => OFFSET.reduce((s, [dx, dy]) => s + Math.hypot(dx, dy) * 0.5 ** k, 0) / OFFSET.length);

function ReprojStepper() {
  const steps = ERR.map((e, k) => `itération k = ${k} : erreur moyenne ${fr(e, 1)} px`);
  return (
    <Stepper steps={steps} interval={1500}>
      {(k) => {
        const SX = 30;
        const SY = 24;
        const S = 0.62;
        const f = 0.5 ** k;
        return (
          <svg viewBox="0 0 860 330" className="w-full max-w-[860px]" role="img" aria-label="Pixels mesurés et pixels reprojetés qui se rapprochent à chaque itération">
            <Sensor x={SX} y={SY} s={S} />
            {MEASURED.map((m, j) => {
              const mx = SX + S * m.x;
              const my = SY + S * m.y;
              const rx = mx + S * OFFSET[j][0] * f;
              const ry = my + S * OFFSET[j][1] * f;
              return (
                <g key={j}>
                  <motion.line x1={r2(mx)} y1={r2(my)} initial={false} animate={{ x2: r2(rx), y2: r2(ry) }} transition={{ duration: 0.6 }} stroke={C.red} strokeWidth={1.5} />
                  <circle cx={r2(mx)} cy={r2(my)} r={4.5} fill={C.blue} />
                  <motion.g initial={false} animate={{ x: r2(rx), y: r2(ry) }} transition={{ duration: 0.6 }}>
                    <line x1={-5} y1={-5} x2={5} y2={5} stroke={C.red} strokeWidth={2.2} />
                    <line x1={-5} y1={5} x2={5} y2={-5} stroke={C.red} strokeWidth={2.2} />
                  </motion.g>
                </g>
              );
            })}
            <circle cx={SX + 10} cy={SY + 480 * S + 22} r={4.5} fill={C.blue} />
            <T x={SX + 20} y={SY + 480 * S + 26} color={C.blue} size={12.5}>
              pixel mesuré
            </T>
            <g transform={`translate(${SX + 150} ${SY + 480 * S + 22})`}>
              <line x1={-5} y1={-5} x2={5} y2={5} stroke={C.red} strokeWidth={2.2} />
              <line x1={-5} y1={5} x2={5} y2={-5} stroke={C.red} strokeWidth={2.2} />
            </g>
            <T x={SX + 160} y={SY + 480 * S + 26} color={C.red} size={12.5}>
              pixel prédit (reprojeté)
            </T>
            <T x={460} y={40} color={C.ink} size={13.5} weight={600}>
              erreur de reprojection
            </T>
            <T x={460} y={64} color={C.ink} size={13.5}>
              = Σ ‖pixel mesuré − pixel prédit‖²
            </T>
            <T x={460} y={92} color={C.text} size={12.5}>
              minimisée sur les 11 paramètres
            </T>
            <T x={460} y={130} color={C.red} size={15} weight={600}>
              {`distance moyenne : ${fr(ERR[k], 1)} px`}
            </T>
            {ERR.map((e, j) => {
              const h = (e / ERR[0]) * 130;
              return (
                <g key={j}>
                  <rect x={470 + j * 58} y={r2(290 - h)} width={40} height={r2(h)} fill={j === k ? C.red : C.fill2} fillOpacity={j === k ? 0.8 : 1} />
                  <T x={490 + j * 58} y={306} anchor="middle" color={C.weak} size={12}>
                    {`k=${j}`}
                  </T>
                </g>
              );
            })}
          </svg>
        );
      }}
    </Stepper>
  );
}

// ---------------------------------------------------------------------------
// 8. En pratique : échiquier, distorsion radiale, cv2.calibrateCamera

function DistortFig() {
  const [k1, setK1] = useState(-0.2);
  const cx = 190;
  const cy = 150;
  const sc = 150;
  const map = (x: number, y: number) => {
    const f = 1 + k1 * (x * x + y * y);
    return { x: cx + sc * x * f, y: cy - sc * y * f };
  };
  const w = 2 / 7;
  const squares: { d: string; dark: boolean }[] = [];
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 5; j++) {
      const x0 = -1 + i * w;
      const y0 = -5 / 7 + j * w;
      const pts: P2[] = [];
      const S = 6;
      for (let t = 0; t < S; t++) pts.push(map(x0 + (w * t) / S, y0));
      for (let t = 0; t < S; t++) pts.push(map(x0 + w, y0 + (w * t) / S));
      for (let t = 0; t < S; t++) pts.push(map(x0 + w - (w * t) / S, y0 + w));
      for (let t = 0; t < S; t++) pts.push(map(x0, y0 + w - (w * t) / S));
      squares.push({ d: `M ${pts.map((p) => `${r2(p.x)} ${r2(p.y)}`).join(" L ")} Z`, dark: (i + j) % 2 === 0 });
    }
  const corners: P2[] = [];
  for (let i = 1; i < 7; i++) for (let j = 1; j < 5; j++) corners.push(map(-1 + i * w, -5 / 7 + j * w));
  return (
    <Figure caption="Une vraie lentille courbe les lignes droites : (x, y) devient (x, y)·(1 + k1·r²), avec r² = x² + y². k1 = −0,2 : lignes bombées en barillet ; k1 = 0 : lignes droites. cv2.calibrateCamera estime aussi ces coefficients de distorsion.">
      <div className="space-y-3">
        <svg viewBox="0 0 860 300" className="w-full max-w-[860px]" role="img" aria-label="Échiquier déformé par la distorsion radiale et calibration OpenCV">
          <ArrowMarkers />
          <rect x={cx - sc} y={cy - (sc * 5) / 7} width={2 * sc} height={(2 * sc * 5) / 7} fill="none" stroke={C.weak} strokeDasharray="4 4" />
          {squares.map((q, k) => (
            <path key={k} d={q.d} fill={q.dark ? C.ink : "none"} fillOpacity={q.dark ? 0.75 : 0} stroke={C.lineStrong} strokeWidth={0.8} />
          ))}
          {corners.map((p, k) => (
            <circle key={k} cx={r2(p.x)} cy={r2(p.y)} r={3} fill={C.green} />
          ))}
          <T x={cx} y={30} anchor="middle" color={C.text} size={12.5}>
            échiquier 7 × 5 cases, coins détectés
          </T>
          <T x={cx} y={282} anchor="middle" color={C.purple} size={13} weight={600}>
            {`k1 = ${fr(k1)}`}
          </T>
          <Arrow from={{ x: 360, y: 150 }} to={{ x: 464, y: 150 }} color="text" width={1.5} />
          <T x={412} y={136} anchor="middle" color={C.text} size={12}>
            plusieurs vues
          </T>
          <rect x={470} y={118} width={200} height={64} fill={C.fill} stroke={C.ink} strokeWidth={1.5} />
          <T x={570} y={146} anchor="middle" color={C.ink} size={13} weight={600}>
            cv2.calibrateCamera
          </T>
          <T x={570} y={166} anchor="middle" color={C.text} size={12}>
            méthode de Zhang
          </T>
          {[
            { y: 80, t: "K", c: "blue" as Color },
            { y: 150, t: "(R, t) par vue", c: "purple" as Color },
            { y: 220, t: "distorsion", c: "orange" as Color },
          ].map((o) => (
            <g key={o.t}>
              <Arrow from={{ x: 670, y: 150 }} to={{ x: 722, y: o.y }} color={o.c} width={1.8} />
              <T x={730} y={o.y + 5} color={C[o.c]} size={13.5} weight={600}>
                {o.t}
              </T>
            </g>
          ))}
        </svg>
        <Slider label="k1 (distorsion)" value={k1} min={-0.2} max={0} step={0.01} onChange={setK1} format={(v) => fr(v)} />
      </div>
    </Figure>
  );
}

// ---------------------------------------------------------------------------

const PY_CODE = `
import numpy as np

def projeter(K, R, tC, pW):
    pC = R.T @ (pW - tC)       # repère monde -> repère caméra
    q = K @ pC                 # coordonnées homogènes
    return q[:2] / q[2]        # division par la 3e composante

def dlt(P, pix):
    """P : N points 3D (N x 3), pix : leurs N pixels (N x 2), N >= 6 non coplanaires."""
    A = []
    for (X, Y, Z), (xs, ys) in zip(P, pix):
        p = np.array([X, Y, Z, 1.0])
        A.append(np.concatenate([p, np.zeros(4), -xs * p]))
        A.append(np.concatenate([np.zeros(4), p, -ys * p]))
    A = np.array(A)                    # 2N x 12
    _, _, Vt = np.linalg.svd(A)
    h = Vt[-1]                         # A h = 0 avec ||h|| = 1
    return h.reshape(3, 4)             # H~, à un facteur près

K = np.array([[800, 0, 320], [0, 800, 240], [0, 0, 1]])
print(projeter(K, np.eye(3), np.zeros(3), np.array([1, 0.5, 4])))   # [520. 340.]
`;

const CV_CODE = `
# TP : coins de l'échiquier détectés dans plusieurs vues
ret, K, dist, rvecs, tvecs = cv2.calibrateCamera(obj_points, img_points, image_size, None, None)
# ret  : erreur de reprojection (RMS, en pixels)
# dist : coefficients de distorsion
# rvecs, tvecs : pose (R, t) de chaque vue
`;

export default function Calibration() {
  return (
    <>
      <Section title="L'idée">
        <Idea>
          Une caméra = 11 paramètres : 5 intrinsèques dans K, 6 extrinsèques (R, t_C). Calibrer, c'est les retrouver à partir de
          points 3D connus et de leurs pixels.
        </Idea>
        <p>Question centrale de la réalité augmentée : sur quel pixel exact tombe un point 3D ?</p>
        <p>
          On prend un <strong>modèle</strong> de caméra (le sténopé), puis on mesure ses paramètres : la{" "}
          <strong>calibration</strong>.
        </p>
      </Section>

      <Section title="Le sténopé : f·X/Z">
        <p>On oublie lentilles, mise au point et flou. On garde un trou : le centre optique C.</p>
        <p>Un plan image virtuel est placé à la distance f devant C. Le rayon de P vers C coupe ce plan.</p>
        <PinholeFig />
        <p>Conséquence : tous les points d'un même rayon tombent sur le même pixel.</p>
        <RayFig />
      </Section>

      <Section title="Du plan image aux pixels : la matrice K">
        <p>
          Le plan image se mesure en unités de longueur ; le capteur compte en pixels. D'où x_S = f·ku·X/Z + u0 et y_S =
          f·kv·Y/Z + v0.
        </p>
        <SensorFig />
        <p>En coordonnées homogènes : on multiplie par K, puis on divise par la 3e composante.</p>
        <KStepper />
      </Section>

      <Section title="Les extrinsèques : placer la caméra dans le monde">
        <p>
          En pratique, on connaît le point dans le repère du <strong>monde</strong>. La caméra a une position t_C (3 paramètres)
          et une orientation R (3 paramètres).
        </p>
        <p>Changement de repère : p_C = Rᵀ (p_W − t_C). Au total 5 + 6 = 11 paramètres.</p>
        <ExtrinsicFig />
      </Section>

      <Section title="Calibrer : DLT, puis erreur de reprojection">
        <p>
          On filme un objet de référence dont on connaît les points 3D. On cherche directement H̃ = K̃ M̃ (3 × 4).
        </p>
        <p>Chaque paire (point 3D, pixel) donne 2 équations linéaires en h. Six points non coplanaires suffisent.</p>
        <DLTStepper />
        <p>
          Les pixels mesurés sont bruités, et la DLT minimise une erreur algébrique, pas une distance en pixels. On affine
          donc en minimisant l'erreur de reprojection.
        </p>
        <ReprojStepper />
        <p>
          En TP : un échiquier filmé sous plusieurs angles (coins faciles à détecter) et <code>cv2.calibrateCamera</code>.
        </p>
        <DistortFig />
      </Section>

      <Section title="Les formules à connaître">
        <Formula>
          <div className="space-y-1.5">
            <div>(x, y) = (f·X/Z, f·Y/Z), Z &gt; 0</div>
            <div>x_S = f·ku·X/Z + u0 ; y_S = f·kv·Y/Z + v0</div>
            <div>K = [[f·ku, a, u0], [0, f·kv, v0], [0, 0, 1]]</div>
            <div>p_C = Rᵀ (p_W − t_C)</div>
            <div>pixel ~ K̃ M̃ p̃_W   avec   K̃ = [K | 0],  M̃ = [[Rᵀ, −Rᵀ t_C], [0, 1]]</div>
            <div className="pt-1 text-fg-strong">DLT : A h = 0, ‖h‖ = 1, A de taille 2N × 12, N ≥ 6 points non coplanaires</div>
          </div>
        </Formula>
        <Code lang="python" mark={[4, 5, 6, 13, 14, 17]} code={PY_CODE} />
        <Code lang="python" code={CV_CODE} />
        <Note title="Lecture">
          <p>
            Le code Python est un exemple type : <code>np.linalg.svd</code> donne le h de norme 1 qui minimise ‖A h‖.
          </p>
          <p>
            OpenCV note la pose autrement : p_C = R·p_W + t. Avec les notations du cours, cela fait R_cv = Rᵀ et t = −Rᵀ t_C.
          </p>
        </Note>
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Sténopé : (x, y) = (f·X/Z, f·Y/Z). Tous les points d'un rayon donnent le même pixel : la profondeur est perdue.</li>
          <li>Pixels : x_S = f·ku·X/Z + u0, y_S = f·kv·Y/Z + v0. Origine en haut à gauche, y vers le bas, centre en (u0, v0).</li>
          <li>K (triangulaire supérieure) : 5 intrinsèques f·ku, f·kv, u0, v0, a (obliquité, presque nulle).</li>
          <li>Extrinsèques : t_C et R, 3 + 3 = 6. p_C = Rᵀ (p_W − t_C). Total : 11 paramètres.</li>
          <li>Homogène : pixel ~ K̃ M̃ p̃_W, puis division par la 3e composante (2080 ; 1360 ; 4) → (520 ; 340).</li>
          <li>DLT : 2 équations par paire, A (2N × 12) h = 0, 11 inconnues, N ≥ 6 non coplanaires ; QR → K et R ; puis on affine l'erreur de reprojection.</li>
          <li>TP : échiquier sous plusieurs angles, cv2.calibrateCamera (Zhang) → K, (R, t) par vue, distorsion.</li>
        </Points>
        <Trap>
          <p>
            11 inconnues, pas 12 : H̃ est définie à un facteur près. Et les 6 points ne doivent pas être tous dans un même plan.
          </p>
        </Trap>
        <Trap title="Piège : les pixels">
          <p>
            K·P = (2080 ; 1360 ; 4) n'est pas un pixel : il faut diviser par la 3e composante. Et (0, 0) est le coin en haut à
            gauche, pas le centre de l'image.
          </p>
        </Trap>
      </Section>

      <Section title="Questions d'examen">
        <Reveal
          question={
            <p>
              f·ku = f·kv = 800, u0 = 320, v0 = 240, caméra à l'origine (R = I, t_C = 0). Sur quel pixel tombe (1 ; 0,5 ; 4) ? Et
              si la caméra recule de 4 le long de son axe ?
            </p>
          }
        >
          <p>K·P = (800·1 + 320·4 ; 800·0,5 + 240·4 ; 4) = (2080 ; 1360 ; 4).</p>
          <p>Division par 4 : pixel (520, 340).</p>
          <p>Recul : t_C = (0 ; 0 ; −4), donc p_C = (1 ; 0,5 ; 8).</p>
          <p>Pixel = (800/8 + 320 ; 400/8 + 240) = (420, 290) : plus près du centre (320, 240).</p>
        </Reveal>
        <Reveal
          question={
            <p>
              Combien de paramètres a une caméra ? Combien de points faut-il pour la DLT, quelle est la taille de A, et pourquoi
              les points ne doivent-ils pas être coplanaires ?
            </p>
          }
        >
          <p>5 intrinsèques (f·ku, f·kv, u0, v0, a) + 6 extrinsèques (t_C, R) = 11.</p>
          <p>H̃ a 12 coefficients, définis à un facteur près : 11 inconnues.</p>
          <p>Chaque paire donne 2 équations : il faut 2N ≥ 11, donc N ≥ 6. Avec 6 points, A est 12 × 12.</p>
          <p>Si tous les points sont dans un même plan, les équations ne fixent pas H̃ de façon unique : la DLT échoue.</p>
        </Reveal>
        <Reveal
          question={
            <p>
              En TP, pourquoi filmer un échiquier sous plusieurs angles, et pourquoi ne pas s'arrêter à la solution de la DLT ?
            </p>
          }
        >
          <p>Les coins d'un échiquier sont faciles à détecter, et leurs positions 3D sont connues.</p>
          <p>Un échiquier est plan : une seule vue ne suffit pas, d'où plusieurs angles (méthode de Zhang, cv2.calibrateCamera).</p>
          <p>
            La DLT minimise une erreur algébrique et les pixels sont bruités. On affine en minimisant l'erreur de reprojection Σ
            ‖mesuré − prédit‖², en estimant aussi la distorsion.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
