import Link from "next/link";
import Shell from "@/components/Shell";
import Segfault from "@/components/Segfault";

export default function NotFound() {
  return (
    <Shell>
      <h1 className="text-2xl font-medium tracking-[-0.02em] leading-none">
        Not found
      </h1>
      <Segfault />
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-2">
          Back home
        </Link>
      </p>
    </Shell>
  );
}
