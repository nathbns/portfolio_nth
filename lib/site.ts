export type SiteLink = {
  label: string;
  href: string;
};

export type Tool = {
  label: string;
  value: string;
};

export type Project = {
  title: string;
  description: string;
  href?: string;
  github?: string;
  tags: readonly string[];
  featured?: boolean;
};

const email = "nathan.ben-soussan@grenoble-inp.org";

const links: SiteLink[] = [
  { label: "GitHub", href: "https://github.com/nathbns" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/nathan-ben-soussan-b44167254/",
  },
  { label: "LeetCode", href: "https://leetcode.com/u/nattendcs/" },
  { label: "Email", href: `mailto:${email}` },
];

const school = {
  name: "Grenoble INP – Ensimag",
  url: "https://ensimag.grenoble-inp.fr/",
  // Le Figaro's 2026 ranking of engineering schools in computer science.
  ranking:
    "https://ensimag.grenoble-inp.fr/fr/l-ecole/lensimag-meilleure-ecole-dingenieurs-informatique-2026",
};

// Months are counted from January 1st, so 4.5 is mid-May.
const internship = {
  year: 2027,
  from: 4.5,
  to: 8.5,
  period: "mid-May to mid-September",
  fields: "parallel computing, systems or machine learning",
};

// The About page reads like a manual page: a description, then one option
// per interest, then the environment it runs in.
const about = {
  // Follows the opening line, which names the school with its links.
  description: [
    "Learns by rebuilding things until they make sense, from tokenizers to a CNN pipeline.",
  ],
  options: [
    {
      flag: "--concurrency",
      text: "Threads sharing memory, and everything that keeps them correct: atomic operations and futexes, monitors, semaphores and channels, up to data structures that need no lock at all.",
    },
    {
      flag: "--parallel",
      text: "Spreading one problem across SIMD lanes, cores and whole machines, scheduling tasks so no core sits idle, keeping data close to the core that uses it, and measuring, because a parallel program that isn't faster isn't finished.",
    },
    {
      flag: "--ml",
      text: "Where the two meet: a model is one very large, very parallel computation. Both halves matter, how it learns and how it runs fast, down to the kernels underneath.",
    },
  ],
};

const tools: Tool[] = [
  { label: "LANGUAGES", value: "C, C++, Python, Go, OCaml, Java, TypeScript, Swift" },
  { label: "PARALLEL", value: "OpenMP, MPI, Linux, perf, Valgrind" },
  { label: "ML", value: "PyTorch, TensorFlow" },
  { label: "WEB", value: "Next.js, React" },
];

const projects: Project[] = [
  {
    title: "YOCO",
    description:
      "An end-to-end machine learning pipeline that reads the FEN notation of a real chess game, from dataset creation to CNN training.",
    github: "https://github.com/nathbns/lifprojet_am1_nn",
    tags: ["Deep Learning", "CNN", "PyTorch"],
    featured: true,
  },
  {
    title: "Tokenizers",
    description:
      "BPE, WordPiece and Unigram implemented from scratch, with a guide on how they differ.",
    github: "https://github.com/nathbns/tokenizer-implementation_scratch",
    tags: ["NLP", "Python"],
    featured: true,
  },
  {
    title: "Clické",
    description:
      "A macOS menu bar screenshot app with clipboard copy, a built-in editor and export presets.",
    href: "https://www.clické.com/",
    github: "https://github.com/nathbns/clicke",
    tags: ["macOS", "Swift"],
    featured: true,
  },
  {
    title: "equaTrix",
    description:
      "A mathematical tool for solving and visualizing linear algebra problems.",
    github: "https://github.com/nathbns/equaTrix",
    tags: ["Linear Algebra", "C++", "Qt"],
    featured: false,
  },
  {
    title: "Gitact",
    description: "A command-line tool for navigating GitHub from the terminal.",
    github: "https://github.com/nathbns/gitact",
    tags: ["Go", "CLI"],
    featured: false,
  },
];

export const site = {
  name: "Nathan Ben Soussan",
  url: "https://nathan-bensoussan.vercel.app",
  email,
  description:
    "Computer science engineering student at Grenoble INP – Ensimag, interested in concurrency, parallel computing and machine learning.",
  tagline: "Concurrency, parallel computing and machine learning",
  links,
  school,
  internship,
  about,
  tools,
  projects,
};
