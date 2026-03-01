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
      <label htmlFor="act-search" className="mb-2 block text-sm text-neutral-600">
        Search offences
      </label>
      <input
        id="act-search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search offences..."
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-800"
      />
    </div>
  );
}
