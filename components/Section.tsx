export default function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-14 ${className}`}>
      <h2 className="text-xs uppercase tracking-widest text-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
