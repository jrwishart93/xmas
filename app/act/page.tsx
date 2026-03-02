import ActHero from "@/components/act/ActHero";
import ActSearch from "@/components/act/ActSearch";
import ActSidebar from "@/components/act/ActSidebar";
import ActPart from "@/components/act/ActPart";
import ScrollLayout from "@/components/ScrollLayout";
import scrollStyles from "@/styles/scroll.module.css";

export default function ActPage() {
  return (
    <div className={scrollStyles.actPage}>
      <ActHero />

      <ScrollLayout>
        <div className={scrollStyles.contentGrid}>
          <ActSidebar />

          <main className={scrollStyles.contentMain}>
            <ActSearch />
            <ActPart />
          </main>
        </div>
      </ScrollLayout>
    </div>
  );
}
