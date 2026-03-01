"use client";

import Image from "next/image";
import OpenBook from "@/app/images/Open-book.png";

export default function ActHero() {
  return (
    <section className="relative h-[55vh] min-h-[420px] w-full overflow-hidden md:h-[65vh] md:min-h-[480px]">
      <div className="absolute inset-0">
        <Image
          src={OpenBook}
          alt="Open Law Book"
          fill
          priority
          className="scale-105 object-cover object-center"
        />

        <div className="absolute inset-0 backdrop-blur-sm" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#f8f6f2] md:from-black/60 md:via-black/40" />
      </div>

      <div className="relative z-10 flex h-full items-center">
        <div className="mx-auto w-full max-w-5xl px-8 text-center md:px-6 md:text-left">
          <div className="max-w-2xl md:max-w-none">
            <h1
              className="text-4xl tracking-[0.02em] text-white md:text-5xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              The Summary Justice
            </h1>

            <p className="mt-2 text-xl text-neutral-200 md:text-2xl">(Social Contributions) Act 2025</p>

            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-neutral-200 md:mx-0">
              A voluntary framework establishing structured contributions, fairness, and accountability within
              the team.
            </p>

            <div className="mx-auto mt-8 h-px w-24 bg-neutral-300 md:mx-0" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-b from-transparent to-[#f8f6f2]" />
    </section>
  );
}
