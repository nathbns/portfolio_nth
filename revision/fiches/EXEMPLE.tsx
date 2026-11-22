"use client";
// MODÈLE DE FICHE (non affiché sur le site) : montre comment utiliser le kit.
// Une fiche = un composant client, enregistré avec ses métadonnées dans
// fiches/<matière>/index.ts.
import { useState } from "react";
import { ArrowMarkers, C, Code, Figure, Idea, Points, Reveal, Section, Slider, Stepper, Trap, motion } from "./kit";

export default function Exemple() {
  const [n, setN] = useState(3);
  return (
    <>
      <Section title="L'idée">
        <Idea>Une phrase qui dit tout : ce qu'il faut savoir faire le jour de l'examen.</Idea>
        <p>
          Un ou deux paragraphes courts, au plus. Un <strong>mot clé</strong> en gras, du <code>code</code> en ligne.
        </p>
      </Section>

      <Section title="Le schéma animé">
        {/* Un pas à pas : chaque étape redessine le SVG ; motion anime les changements. */}
        <Stepper steps={["Le producteur dépose 1", "Il dépose 2", "Le consommateur retire 1"]}>
          {(i) => {
            const items = i === 0 ? [1] : i === 1 ? [1, 2] : [2];
            return (
              <svg viewBox="0 0 520 140" className="w-full max-w-[520px]" role="img" aria-label="File">
                <ArrowMarkers />
                <rect x={150} y={40} width={220} height={60} fill={C.fill} stroke={C.lineStrong} />
                {items.map((v, k) => (
                  <motion.g key={v} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <rect x={160 + k * 52} y={52} width={40} height={36} fill="none" stroke={C.blue} strokeWidth={2} />
                    <text x={180 + k * 52} y={75} textAnchor="middle" fill={C.ink} fontSize={14}>
                      {v}
                    </text>
                  </motion.g>
                ))}
                <line x1={60} y1={70} x2={145} y2={70} stroke={C.green} strokeWidth={2} markerEnd="url(#arr-green)" />
                <text x={20} y={60} fill={C.weak} fontSize={12}>
                  envoi
                </text>
              </svg>
            );
          }}
        </Stepper>

        {/* Un schéma interactif : un curseur pilote le dessin. */}
        <Figure caption="Bouger le curseur : le nombre de cases change.">
          <div className="space-y-4">
            <Slider label="Places" value={n} min={1} max={6} onChange={setN} />
            <svg viewBox="0 0 400 60" className="w-full max-w-[400px]">
              {Array.from({ length: n }, (_, k) => (
                <motion.rect key={k} layout x={10 + k * 60} y={10} width={50} height={40} fill="none" stroke={C.orange} strokeWidth={2} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
              ))}
            </svg>
          </div>
        </Figure>
      </Section>

      <Section title="Le code à connaître">
        <Code lang="c" mark={[2]} code={`while (plein)\n    cnd_wait(&c, &m);  // toujours dans un while\n`} />
      </Section>

      <Section title="À retenir">
        <Points>
          <li>Trois à six points, une idée par point.</li>
          <li>Les chiffres exacts du cours.</li>
        </Points>
        <Trap>
          <p>L&apos;erreur classique, et pourquoi c&apos;est faux.</p>
        </Trap>
        <Reveal question={<p>Une question comme à l&apos;examen ?</p>}>
          <p>La réponse attendue, courte et complète.</p>
        </Reveal>
      </Section>
    </>
  );
}
