"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { site } from "@/lib/site";

const navLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/log", label: "Log" },
  { href: "/about", label: "About" },
  { href: "/cv", label: "CV" },
];

export default function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-medium tracking-[-0.02em] hover:text-muted"
      >
        <Image
          src="/pfp.jpg"
          alt=""
          width={28}
          height={28}
          priority
          className="size-7 rounded-full object-cover"
        />
        {site.name}
      </Link>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-muted">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={
              isActive(link.href)
                ? "text-foreground"
                : "hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        ))}
        <ThemeToggle />
      </div>
    </nav>
  );
}
