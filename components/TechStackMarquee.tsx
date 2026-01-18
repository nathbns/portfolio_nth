'use client'

import Image from "next/image";

const techStack = [
  { name: "C", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg" },
  { name: "C++", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
  { name: "Java", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
  { name: "Swift", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg" },
  { name: "TypeScript", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
  { name: "Python", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
  { name: "SQL", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azuresqldatabase/azuresqldatabase-original.svg" },
  { name: "PyTorch", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" },
  { name: "TensorFlow", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
  { name: "Pandas", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg" },
  { name: "NumPy", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg" },
  { name: "Next.js", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" },
  { name: "React", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
  { name: "PostgreSQL", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" },
  { name: "Git", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
];

function TechItem({ tech }: { tech: typeof techStack[0] }) {
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 px-3 sm:px-6 shrink-0">
      <div className="w-10 h-10 sm:w-12 sm:h-12 relative">
        <Image
          src={tech.icon}
          alt={tech.name}
          width={48}
          height={48}
          className="w-full h-full object-contain opacity-60 hover:opacity-100 transition-opacity"
          unoptimized
        />
      </div>
      <span className="text-[10px] sm:text-xs text-foreground/50 whitespace-nowrap">{tech.name}</span>
    </div>
  );
}

interface TechStackMarqueeProps {
  className?: string;
}

export default function TechStackMarquee({ className = "" }: TechStackMarqueeProps) {
  return (
    <>
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-container {
          display: flex;
          width: max-content;
          animation: marquee-scroll 20s linear infinite;
        }
        .marquee-container:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className={`w-full overflow-hidden ${className}`}>
        <div className="relative">
          <div className="marquee-container">
            {techStack.map((tech) => (
              <TechItem key={tech.name} tech={tech} />
            ))}
            {techStack.map((tech) => (
              <TechItem key={`dup-${tech.name}`} tech={tech} />
            ))}
          </div>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 w-8 sm:w-16 h-full bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 w-8 sm:w-16 h-full bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
        </div>
      </div>
    </>
  );
}
