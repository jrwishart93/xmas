type ActOffenceCardProps = {
  code: string;
  title: string;
  description: string;
  tag: string;
};

export default function ActOffenceCard({ code, title, description, tag }: ActOffenceCardProps) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="rounded-md bg-neutral-100 px-3 py-1 font-mono text-sm text-neutral-700">{code}</div>

        <div>
          <h3 className="text-lg font-semibold">{title}</h3>

          <p className="mt-2 leading-relaxed text-neutral-600">{description}</p>

          <div className="mt-4">
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{tag}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
