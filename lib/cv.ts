// The CV as data, transcribed from public/cv.pdf. Keep the two in step.

export type Entry = {
  when: string;
  title: string;
  place?: string;
  href?: string;
  detail?: string;
};

export type Skill = { label: string; value: string };

const education: Entry[] = [
  {
    when: "2026 – 2028",
    title: "Master's degree in computer science",
    place: "Grenoble INP – Ensimag, UGA",
  },
  {
    when: "2023 – 2026",
    title: "Bachelor's degree in computer science",
    place: "Claude Bernard University Lyon 1",
  },
  {
    when: "2020 – 2023",
    title: "Bachelor's degree in management",
    place: "IAE, University Lyon 3",
  },
];

const projects: Entry[] = [
  {
    when: "Swift · macOS",
    title: "Clické",
    href: "https://www.clické.com/",
    detail:
      "Built and shipped a macOS menu bar screenshot app with automatic clipboard copy, a built-in editor and export presets.",
  },
  {
    when: "Python",
    title: "YOCO (You Only Chess Once)",
    href: "https://github.com/nathbns/lifprojet_am1_nn",
    detail:
      "An end-to-end machine learning pipeline: dataset creation, image processing and CNN training.",
  },
  {
    when: "Python",
    title: "BPE, WordPiece and Unigram tokenizers",
    href: "https://github.com/nathbns/tokenizer-implementation_scratch",
    detail:
      "Three tokenization algorithms implemented from scratch, with a learning guide on how they work and how they differ.",
  },
  {
    when: "Go",
    title: "Gitact",
    href: "https://github.com/nathbns/gitact",
    detail: "A command-line tool for navigating GitHub from the terminal.",
  },
];

const experience: Entry[] = [
  {
    when: "Apr – Jul 2026",
    title: "Software engineering intern",
    place: "Hospices Civils de Lyon (HCL), Lyon",
    detail:
      "Compression of histology whole-slide images (SVS, DICOM, MRXS), which reach tens of gigabytes and are stored in pyramidal formats similar to TIFF. Reviewed existing methods and the state of the art, ran experiments and benchmarked the approaches.",
  },
  {
    when: "Nov 2023 – Jan 2024",
    title: "Sales associate",
    place: "Crédit Agricole, Saint-Laurent-de-Chamousset",
    detail:
      "Welcomed and advised clients in branch and over the phone, and handled day-to-day account management.",
  },
  {
    when: "Aug – Oct 2023",
    title: "Private tutor",
    place: "Cours Ado, Lyon",
    detail:
      "Taught mathematics to middle and high school students in one-on-one sessions, with personalised exercises and progress tracking.",
  },
];

const skills: Skill[] = [
  { label: "Programming", value: "C/C++, Python, TypeScript, Java, OCaml, Swift, Go" },
  { label: "Frameworks & tools", value: "Next.js, PyTorch, TensorFlow" },
  { label: "Soft skills", value: "Client relations, teaching and explaining, autonomy" },
  { label: "Languages", value: "French (native), English (intermediate, B2)" },
  { label: "Interests", value: "Tech news, chess, sports" },
];

export const cv = { education, projects, experience, skills };
