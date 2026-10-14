import Link from "next/link";
import { Github, Linkedin, Mail } from "lucide-react";
import { SiLeetcode } from "react-icons/si";
import { site } from "@/lib/site";

const socials = [
  { href: "https://github.com/nathbns", label: "GitHub", Icon: Github },
  {
    href: "https://www.linkedin.com/in/nathan-ben-soussan-b44167254/?locale=en_US",
    label: "LinkedIn",
    Icon: Linkedin,
  },
  { href: "https://leetcode.com/u/nattendcs/", label: "LeetCode", Icon: SiLeetcode },
  { href: `mailto:${site.email}`, label: "Email", Icon: Mail },
];

const sha = process.env.BUILD_SHA ?? "dev";
const built = process.env.BUILD_DATE;

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border pt-6 text-[15px] text-muted">
      <div className="flex items-center justify-between gap-4">
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
        <div className="flex items-center gap-4">
          {socials.map(({ href, label, Icon }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="transition-colors hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-2 font-mono text-[12px]">
        <a
          href={`https://github.com/nathbns/portfolio_nth/commit/${sha}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          build {sha}
        </a>
        {built && <span> · {built}</span>}
        <span className="hidden sm:inline"> · press ? for keyboard shortcuts</span>
      </p>
    </footer>
  );
}
