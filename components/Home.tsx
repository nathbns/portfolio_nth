"use client";

import HeaderWithDiagonals from "@/components/HeaderWithDiagonal";
import Image from "next/image";
import HomeSection from "./HomeSection";
import ProjectCard from "./ProjectCard";
import ContributionsDisplay from "./ContributionDisplay";
import Footer from "./Footer";
import { Calendar, Clock } from "lucide-react";
import TechStackMarquee from "./TechStackMarquee";

const projects = [
  {
    title: "Clické",
    description: "Faster, cleaner screenshots that you can edit.",
    image: "/projects/clicke_project.png",
    github: "https://github.com/nathbns/clicke",
    tags: ["macOS", "Swift", "screenshot"]
  },
  {
    title: "equaTrix",
    description: "A mathematical tool for solving and visualizing linear algebra problems.",
    image: "/projects/equatrix_project.png",
    github: "https://github.com/nathbns/equaTrix",
    tags: ["Linear Algebra", "C++", "Qt"]
  },
  {
    title: "YOCO Project",
    description: "CNN model for getting the fen notation of a real chess game.",
    image: "/projects/yoco_project.png",
    github: "https://github.com/nathbns/lifprojet_am1_nn",
    tags: ["Deep Learning", "CNN", "YOLO"]
  }
]

export default function Hero() {
  return (
    <div
      className="min-h-screen transition-colors duration-300 relative overflow-x-hidden"
    >
      {/* Header avec hachures diagonales dans les coins - PLEINE LARGEUR */}
      <HeaderWithDiagonals />

      {/* Conteneur principal - même max-w-4xl que le header */}
      <div className="relative mx-auto max-w-4xl min-h-screen">

        {/* Contenu principal */}
        <div>
          <HomeSection title="about">
            <div className="flex items-center justify-start">
              <div className="pr-4">
                <Image src="/pfp.jpg" alt="Nathan BEN SOUSSAN" width={64} height={64} className="rounded-full" />
              </div>
              Nathan BEN SOUSSAN, 23  <br />
              computer science student | developer
            </div>
          </HomeSection>

          <HomeSection title="internship">
            <div className="space-y-4 pb-12">
              <div className="flex items-center gap-2 text-foreground/80">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 text-stone-400 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-stone-400 animate-pulse" />
                  Looking for an internship
                </span>
              </div>
              <p className="text-foreground/70">
                I am currently seeking an internship opportunity starting from <strong>May 1st, 2025</strong>.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-foreground/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Starting: May 1st, 2025</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Duration: 3 to 4 months</span>
                </div>
              </div>
              <p className="text-sm text-foreground/50">
                Open to opportunities in software development.
              </p>
            </div>
          </HomeSection>

          <HomeSection title="education">
            <div className="flex items-center justify-start text-foreground/50">
            2025 - present · BSc Computer Science — Year 3 (current year)
            <br />
            2024 - 2025 · BSc Computer Science — Year 2 (ranked 7 / 160)
            <br />
            2023 - 2024 · BSc Computer Science — Year 1 (ranked 3 / 338)
            </div>
          </HomeSection>

          <HomeSection title="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
              {projects.map((project) => (
                <ProjectCard key={project.title} {...project} />
              ))}
            </div>
          </HomeSection>
          
          <HomeSection title="skills">
            <div className="sm:px-12 mt-4 sm:mt-6 mb-4 sm:mb-6">
                <div className="px-4">
                  <TechStackMarquee className="w-full" />
                </div>
            </div>
          </HomeSection>

          <HomeSection title="github activity">
              <div className="sm:px-12 px-0 mt-4">
                  <div className="mb-4 sm:mb-6">
                    <ContributionsDisplay
                      username="nathbns"
                      variant="compact"
                      className="w-full"
                    />
                  </div>
                </div>
          </HomeSection>
        </div>
      </div>

      <Footer />
    </div>
  );
}
