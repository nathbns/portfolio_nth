"use client";

import { useState } from "react";
import School from "@/components/School";

// Two lengths of the same story: a short one for a first visit, and the long
// way round, from the first computer to now.

const link =
  "underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground";

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
      {children}
    </a>
  );
}

function Short() {
  return (
    <>
      <p>
        I&apos;m Nathan, a computer science engineering student at <School />.
        I&apos;m interested in what happens when a computer does many things at
        once: concurrency, parallel computing, and machine learning, where the
        two meet in one very large, very parallel computation.
      </p>
      <p>
        I got into computers as a kid because of my older brother, and
        I&apos;ve been trying to understand how they work ever since, usually
        by rebuilding things from scratch until they make sense. Away from the
        keyboard: chess, sport, and too much tech news.
      </p>
    </>
  );
}

function Long() {
  return (
    <>
      <p>
        I got into computers because of my older brother. He was into them long
        before me, and I wanted to understand what he was doing. Then I started
        building small tools for myself, and I never really stopped.
      </p>
      <p>
        It took a detour before it became my path. I first studied management
        at IAE Lyon, from 2020 to 2023, then switched to a computer science
        degree at Claude Bernard University Lyon 1.
      </p>
      <p>
        Along the way the side projects piled up:{" "}
        <A href="https://github.com/nathbns/gitact">Gitact</A>, a command-line
        tool for GitHub written in Go;{" "}
        <A href="https://github.com/nathbns/equaTrix">equaTrix</A>, a linear
        algebra solver in C++ and Qt; and{" "}
        <A href="https://www.clické.com/">Clické</A>, a macOS screenshot app I
        built and shipped.
      </p>
      <p>
        Chess and machine learning met in{" "}
        <A href="https://github.com/nathbns/lifprojet_am1_nn">YOCO</A>, a
        university project that reads the position of a real chess game from a
        photo, from building the dataset to training the CNN. Then I implemented
        the{" "}
        <A href="https://github.com/nathbns/tokenizer-implementation_scratch">
          BPE, WordPiece and Unigram tokenizers
        </A>{" "}
        from scratch, to see what a language model actually reads.
      </p>
      <p>
        In 2026 I did my first engineering internship, at the Hospices Civils
        de Lyon, on compressing histology slides: images that reach tens of
        gigabytes each. It made performance very concrete.
      </p>
      <p>
        That fall I joined <School />. Today I&apos;m drawn to the layer where
        software meets the machine: threads and the primitives that keep them
        correct, work spread across cores and machines, and the parallel
        arithmetic underneath machine learning.
      </p>
      <p>
        Along the way I also tutored maths to middle and high school students.
        Outside of computers: chess, sport, and too much tech news.
      </p>
    </>
  );
}

export default function Bio() {
  const [long, setLong] = useState(false);
  const choice = (on: boolean) =>
    `cursor-pointer transition-colors ${on ? "text-foreground" : "hover:text-foreground"}`;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs uppercase tracking-widest text-muted">Bio</h2>
        <div className="font-mono text-[12px] text-muted">
          <button type="button" aria-pressed={!long} onClick={() => setLong(false)} className={choice(!long)}>
            short
          </button>
          <span aria-hidden> · </span>
          <button type="button" aria-pressed={long} onClick={() => setLong(true)} className={choice(long)}>
            long
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-4">{long ? <Long /> : <Short />}</div>
    </section>
  );
}
