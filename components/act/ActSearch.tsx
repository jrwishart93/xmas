"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ActSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }

      const qs = params.toString();
      router.replace(qs ? `/act?${qs}` : "/act", { scroll: false });
    }, 180);

    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  return (
    <div className="mb-10 rounded-md border border-[#d9c7a6] bg-[#f7f0de] p-4 sm:p-5">
      <label htmlFor="act-search" className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#705d3f]">
        Search listed acts
      </label>
      <input
        id="act-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by section, title, or type..."
        className="w-full rounded-md border border-[#ccb68f] bg-[#fffdf7] px-4 py-3 text-[#2b2419] shadow-inner placeholder:text-[#8d7a5a] focus:outline-none focus:ring-2 focus:ring-[#8b6f3d]/40"
      />
    </div>
  );
}
