'use client'

import Pattern from "./Pattern";
import ThemeToggle from "./ThemeToggle";


export default function HeaderWithDiagonals() {
    return (
      <div className="relative w-full h-12 overflow-visible">
        {/* Conteneur centré max-w-4xl - même que le contenu principal */}
        <div className="relative mx-auto max-w-4xl h-full pointer-events-none">
          {/* Hachures diagonales GAUCHE - de l'extrémité de la page jusqu'au bord du conteneur */}
          <div
            className="absolute opacity-[0.2] top-0 right-full h-12 text-foreground"
            style={{
                width: '100vw',
                backgroundImage: 'repeating-linear-gradient(-120deg, transparent, transparent 1px, currentcolor 2px, currentcolor 2px, transparent 3px, transparent 10px)'
              }}
          />

          {/* Hachures diagonales DROITE - de l'extrémité de la page jusqu'au bord du conteneur */}
          <div
            className="absolute opacity-[0.2] top-0 left-full h-12 text-foreground"
            style={{
                width: '100vw',
                backgroundImage: 'repeating-linear-gradient(120deg, transparent, transparent 1px, currentcolor 2px, currentcolor 2px, transparent 3px, transparent 10px)'
              }}
          />

          <Pattern side="left" className="z-10" />
          <Pattern side="right" className="z-10" />

          {/* Quote - centrée dans le conteneur */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[12px] md:text-[14px] sm:text-[14px] text-center px-2 sm:px-4 italic leading-tight">" no amount of money ever bought a second of time "</p>
            <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4 pointer-events-auto z-50">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Theme toggle - positioned in right diagonal area */}
        {/* <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-auto z-50">
          <ThemeToggle />
        </div> */}

        {/* Ligne horizontale en bas - pleine largeur */}
        <div className="absolute opacity-[0.2] bottom-0 left-0 right-0 border-t border-foreground" />
      </div>
    );
  }