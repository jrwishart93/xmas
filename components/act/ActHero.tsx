export default function ActHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-neutral-900 to-neutral-800 py-24 text-white">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-7xl font-semibold tracking-[0.35em] text-white/5 md:text-8xl">ACT 2025</span>
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <h1 className="text-4xl tracking-tight md:text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>
          The Summary Justice (Social Contributions) Act 2025
        </h1>

        <p className="mt-4 text-lg text-neutral-300">
          A voluntary framework for structured team contributions
        </p>

        <p className="mt-6 text-sm text-neutral-400">Last amended: March 2026</p>

        <div className="mx-auto mt-8 h-px w-32 bg-neutral-600" />
      </div>
    </section>
  );
}
