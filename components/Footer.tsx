'use client'

import Link from 'next/link'
import { Github, Linkedin, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-foreground/50">
            © {new Date().getFullYear()} Nathan BEN SOUSSAN
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/nathbns"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </Link>
            <Link
              href="https://www.linkedin.com/in/nathan-ben-soussan-b44167254/?locale=en_US"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 hover:text-foreground transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </Link>
            <Link
              href="mailto:nathan.ben-soussan@etu.univ-lyon1.fr"
              className="text-foreground/50 hover:text-foreground transition-colors"
              aria-label="Email"
            >
              <Mail className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
