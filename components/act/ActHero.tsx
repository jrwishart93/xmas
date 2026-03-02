"use client";

import Image from "next/image";
import OpenBook from "@/app/images/Open-book.png";

export default function ActHero() {
  return (
    <section className="relative min-h-[460px] w-full overflow-hidden border-b border-[#cfbe9d]/70 bg-[#2d2517] md:min-h-[560px]">
      <div className="absolute inset-0">
        <Image
          src={OpenBook}
          alt="Open Law Book"
          fill
          priority
          className="scale-110 object-cover object-center"
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(249,239,214,0.38),transparent_45%),linear-gradient(to_bottom,rgba(23,17,8,0.88),rgba(44,32,18,0.72),#f4efdf)]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-6 py-20 text-[#f6f0e0] md:px-10">
        <p className="mb-3 w-fit border border-[#d6bf8b]/70 bg-[#271f13]/70 px-4 py-1 text-xs uppercase tracking-[0.22em] text-[#e8d4ad]">
          Statute Register
        </p>

        <h1 className="max-w-3xl text-4xl leading-tight tracking-[0.02em] md:text-6xl" style={{ fontFamily: "var(--font-playfair)" }}>
          The Summary Justice (Social Contributions) Act 2025
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#e3d9c4] md:text-base">
          Consolidated provisions, schedules, and sanctions presented in a formal register layout inspired by
          traditional bound law volumes.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.14em] text-[#ead7af] md:text-sm">
          <span className="border border-[#c8ab74]/60 bg-[#231a10]/65 px-3 py-2">3 Parts</span>
          <span className="border border-[#c8ab74]/60 bg-[#231a10]/65 px-3 py-2">6 Listed Acts</span>
          <span className="border border-[#c8ab74]/60 bg-[#231a10]/65 px-3 py-2">Searchable Register</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-28 w-full bg-gradient-to-b from-transparent to-[#f4efdf]" />
    </section>
  );
}
