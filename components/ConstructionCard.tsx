import { Hammer } from 'lucide-react';

export default function ConstructionCard() {
  return (
    <section className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur-sm">
      <Hammer className="mx-auto h-8 w-8 text-slate-300" />
      <h1 className="mt-4 text-3xl font-semibold text-slate-100">Feature Under Construction</h1>
      <p className="mt-2 text-slate-300">This functionality is currently being finalised.</p>
      <p className="mt-4 text-slate-400">
        The Summary Justice (Social Contributions) system is actively being enhanced. This feature will be available in an upcoming
        release.
      </p>
      <a
        href="/app/dashboard/"
        className="mt-6 inline-flex rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/20"
      >
        Return to Dashboard
      </a>
      <p className="mt-5 text-xs text-slate-500">Preview Environment</p>
    </section>
  );
}
