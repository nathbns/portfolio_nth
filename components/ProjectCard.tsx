'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Github } from 'lucide-react'

interface ProjectCardProps {
  title: string
  description: string
  image: string
  github: string
  tags?: string[]
}

export default function ProjectCard({ title, description, image, github, tags }: ProjectCardProps) {
  return (
    <div className="group relative border border-dashed border-foreground/20 rounded-lg overflow-hidden hover:border-foreground/40 transition-colors">
      <div className="relative aspect-video overflow-hidden bg-foreground/5">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm sm:text-base text-foreground">{title}</h3>
          <Link
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/50 hover:text-foreground transition-colors shrink-0"
          >
            <Github className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-xs sm:text-sm text-foreground/60 mt-2 line-clamp-2">{description}</p>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/60"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
