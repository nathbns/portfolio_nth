"use client";

interface PatternProps {
  side: "right" | "left";
  className?: string;
  topOffset?: string;
  bottomOffset?: string;
}

export default function Pattern({
  side,
  className = "",
  topOffset = "0",
  bottomOffset = "0",
}: PatternProps) {
  // Bordure côté intérieur (vers le contenu)
  const borderSideClass = side === "right" ? "border-l" : "border-r";
  // Position à l'extérieur du conteneur
  const positionClass = side === "right" ? "left-full" : "right-full";

  return (
    <div
      className={`absolute ${positionClass} w-[60px] overflow-hidden sm:block hidden ${bottomOffset === "0" ? "h-full" : ""} ${className}`}
      style={{ 
        top: topOffset,
        ...(bottomOffset !== "0" && { height: `calc(100% - ${bottomOffset})` }),
      }}
    >
      <div
        className={`absolute opacity-[0.2] inset-0 w-[60px] h-full ${borderSideClass}  border-foreground`}
      />
    </div>
  );
}
