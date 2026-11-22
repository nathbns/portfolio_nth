import Link from "next/link";
import { url } from "@/revision/lib/content";

export default function NotFound() {
  return (
    <div className="py-24">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-mono text-4xl tracking-tight text-fg-strong">Page introuvable.</h1>
      <p className="mt-4 text-fg-weak">Le dossier a peut-être été renommé ou déplacé dans le dépôt.</p>
      <Link href={url("/")} className="mt-8 inline-block border border-line px-4 py-2 font-mono text-[13px] text-fg-strong hover:border-line-strong">
        ← retour à l&apos;accueil
      </Link>
    </div>
  );
}
