type ActOffenceCardProps = {
  code: string;
  title: string;
  description: string;
  tag: string;
};

export default function ActOffenceCard({ code, title, description, tag }: ActOffenceCardProps) {
  return (
    <article className="mb-5 rounded-md border border-[#dbcaa9] bg-[#fffaf0] px-4 py-5 shadow-[0_5px_18px_rgba(45,32,14,0.06)] sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-[#856534] sm:text-sm">Section {code}</span>
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#6a5636] sm:text-xs">{tag}</p>
      </div>

      <h3 className="mt-2 text-lg font-semibold tracking-[0.01em] text-[#1f1a14] sm:text-xl">{title}</h3>

      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#4f4333] sm:text-base">{description}</p>
    </article>
  );
}
