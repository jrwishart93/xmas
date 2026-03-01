import ActHero from "@/components/act/ActHero";
import ActSearch from "@/components/act/ActSearch";
import ActSidebar from "@/components/act/ActSidebar";
import ActPart from "@/components/act/ActPart";

export default function ActPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-0 text-neutral-900">
      <ActHero />

      <div className="mx-auto flex max-w-7xl gap-12 px-6 py-12">
        <ActSidebar />

        <main className="max-w-3xl flex-1">
          <ActSearch />

          <ActPart />
        </main>
      </div>
    </div>
  );
}
