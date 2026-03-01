import ActHero from "@/components/act/ActHero";
import ActSearch from "@/components/act/ActSearch";
import ActSidebar from "@/components/act/ActSidebar";
import ActPart from "@/components/act/ActPart";

export default function ActPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-[#f8f6f2] py-0 text-[#1c1c1c]">
      <ActHero />

      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-20 lg:flex-row">
        <ActSidebar />

        <main className="min-w-0 flex-1">
          <ActSearch />
          <ActPart />
        </main>
      </div>
    </div>
  );
}
