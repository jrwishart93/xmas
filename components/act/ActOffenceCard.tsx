type ActOffenceCardProps = {
  code: string;
  title: string;
  description: string;
  tag: string;
};

export default function ActOffenceCard({ code, title, description, tag }: ActOffenceCardProps) {
  return (
    <article className="mb-10 border-b border-[#e4e2dd] pb-8">
      <span className="font-mono text-sm text-[#8b6f3d]">Section {code}</span>

      <h3 className="mt-2 text-xl font-semibold tracking-[0.01em] text-[#1c1c1c]">{title}</h3>

      <p className="mt-4 max-w-2xl leading-relaxed text-neutral-700">{description}</p>

      <p className="mt-4 text-xs uppercase tracking-[0.08em] text-[#6b6b6b]">{tag}</p>
    </article>
  );
}
