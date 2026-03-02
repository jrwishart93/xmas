import ActHero from "@/components/act/ActHero";
import ActSearch from "@/components/act/ActSearch";
import ActSidebar from "@/components/act/ActSidebar";
import ActPart from "@/components/act/ActPart";

export default function ActPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-[#f4efdf] py-0 text-[#1f1a14]">
      <ActHero />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:flex-row lg:gap-16 lg:py-16">
        <ActSidebar />

        <main className="min-w-0 flex-1 rounded-lg border border-[#d7c6a4]/80 bg-[#fbf8ef] p-4 shadow-[0_10px_35px_rgba(58,39,15,0.08)] sm:p-6 lg:p-8">
          <ActSearch />
          <ActPart />
        </main>
      </div>
    </div>
  );
}
