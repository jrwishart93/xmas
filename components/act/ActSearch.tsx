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
    <div className="mb-12">
      <label htmlFor="act-search" className="mb-2 block text-sm text-[#6b6b6b]">
        Search offences
      </label>
      <input
        id="act-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search offences..."
        className="w-full rounded-md border border-[#e4e2dd] bg-white px-4 py-3 text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#8b6f3d]/40"
      />
    </div>
  );
}
