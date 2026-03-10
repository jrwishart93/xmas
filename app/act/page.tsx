import { Suspense } from "react";
import ActHero from "@/components/act/ActHero";
import ActBook from "@/components/act/ActBook";
import ScrollLayout from "@/components/ScrollLayout";
import scrollStyles from "@/styles/scroll.module.css";

export default function ActPage() {
  return (
    <div className={scrollStyles.actPage}>
      <ActHero />
      <ScrollLayout>
        <Suspense
          fallback={
            <div className="py-10 text-center text-sm text-[#7a6545]">Loading…</div>
          }
        >
          <ActBook />
        </Suspense>
      </ScrollLayout>
    </div>
  );
}
