"use client";

import { usePathname } from "next/navigation";

// FNV-1a over the path, so every missing page faults at its own address.
function address(path: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `0x00007f${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export default function Segfault() {
  const path = usePathname() ?? "/";

  return (
    <pre className="mt-6 overflow-x-auto font-mono text-[13px] leading-relaxed text-muted">
      {`Segmentation fault (core dumped)\nsi_addr ${address(path)}: nothing is mapped at ${path}`}
    </pre>
  );
}
