'use client'
import Pattern from "./Pattern";
import DiagonalPattern from "./DiagonalPattern";
import CornerPattern from "./CornerPattern";

// Composant Section réutilisable
export default function HomeSection({
    title,
    children,
    className = "",
  }: {
    title: string;
    children?: React.ReactNode;
    className?: string;
  }) {
    return (
      <section className={`relative ${className}`}>
        <Pattern side="left" bottomOffset="50px" />
        <Pattern side="right" bottomOffset="50px" />

        {/* Side patterns with dots */}
        <CornerPattern side="left"  bottomOffset="50px"/>
        <CornerPattern side="right" bottomOffset="50px"/>

        <div className="py-12 px-4 sm:px-8">
          <h2 className="text-xs uppercase tracking-widest text-foreground/40 mb-6">
            {title}
          </h2>
          <div className="min-h-[120px]">
            {children}
          </div>
        </div>
        <DiagonalPattern />
      </section>
    );
  }