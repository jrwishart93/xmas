"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Link2,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import scrollStyles from "@/styles/scroll.module.css";

type Offence = {
  code: string;
  title: string;
  description: string;
  tag: string;
};

type Part = {
  id: string;
  label: string;
  title: string;
  offences: Offence[];
};

const PARTS: Part[] = [
  {
    id: "part-1",
    label: "Part I",
    title: "Administrative & Attendance Breaches",
    offences: [
      {
        code: "1.1",
        title: "Late for Duty",
        description:
          "Applies where an officer reports for duty after their scheduled start time. Contribution may increase proportionate to lateness.",
        tag: "Administrative",
      },
      {
        code: "1.2",
        title: "Failure to Clock Out",
        description:
          "Covers omissions in attendance records requiring supervisory correction or reconciliation after shift completion.",
        tag: "Attendance",
      },
    ],
  },
  {
    id: "part-2",
    label: "Part II",
    title: "Life Events & Ceremonial Obligations",
    offences: [
      {
        code: "2.1",
        title: "Birthday Round Omission",
        description:
          "Where a recognised celebratory event occurs without a reasonable contribution toward shared refreshments.",
        tag: "Life Event",
      },
      {
        code: "2.2",
        title: "Unannounced Annual Leave Return",
        description:
          "Applies when personnel return from annual leave without prior notice to colleagues for planning and morale.",
        tag: "Communication",
      },
    ],
  },
  {
    id: "part-3",
    label: "Part III",
    title: "Operational & Conduct Matters",
    offences: [
      {
        code: "3.1",
        title: "Unresolved Kettle Usage",
        description:
          "Addresses repeated communal kitchen disruption that places operational beverage readiness at risk.",
        tag: "Operational",
      },
      {
        code: "3.2",
        title: "Persistent Reply-All Misuse",
        description:
          "Engaging broad communication channels for non-essential correspondence that materially affects inbox hygiene.",
        tag: "Conduct",
      },
    ],
  },
];

const TOTAL_SECTIONS = PARTS.reduce((sum, p) => sum + p.offences.length, 0);

export default function ActBook() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activePartIndex, setActivePartIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const chapterRef = useRef<HTMLDivElement>(null);
  const isSearching = query.trim().length > 0;

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("act-bookmarks");
      if (saved) setBookmarks(JSON.parse(saved));
    } catch {}
  }, []);

  // Handle URL hash for deep linking (e.g. /act#section-1.2)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("section-")) {
      const code = hash.slice(8);
      const partIndex = PARTS.findIndex((p) => p.offences.some((o) => o.code === code));
      if (partIndex !== -1) {
        setActivePartIndex(partIndex);
        setExpandedSections(new Set([code]));
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 200);
      }
    }
  }, []);

  // Sync search query to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `/act?${qs}` : "/act", { scroll: false });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  // Track reading progress within the current chapter
  useEffect(() => {
    setProgress(0);
    const handleScroll = () => {
      const el = chapterRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = Math.max(0, -(rect.top - 80));
      const total = Math.max(1, el.offsetHeight - window.innerHeight + 160);
      setProgress(Math.min(100, Math.round((scrolled / total) * 100)));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activePartIndex]);

  const toggleSection = (code: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleBookmark = (code: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(code) ? prev.filter((b) => b !== code) : [...prev, code];
      try {
        localStorage.setItem("act-bookmarks", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/act#section-${code}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {});
  };

  const goToPart = (index: number) => {
    setActivePartIndex(index);
    setExpandedSections(new Set());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigatePart = (delta: number) => {
    const next = activePartIndex + delta;
    if (next >= 0 && next < PARTS.length) goToPart(next);
  };

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = query.trim().toLowerCase();
    return PARTS.flatMap((part) =>
      part.offences
        .filter((o) =>
          `${o.code} ${o.title} ${o.description} ${o.tag}`.toLowerCase().includes(q),
        )
        .map((o) => ({ ...o, partLabel: part.label })),
    );
  }, [query, isSearching]);

  const activePart = PARTS[activePartIndex];

  return (
    <div className="py-4 sm:py-6">
      {/* Act metadata */}
      <div className="mb-5 rounded border border-[#cdb88a]/50 bg-[#fffef8]/60 px-4 py-3">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a6040]">
          Act Particulars
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          {(
            [
              ["Version", "As Amended"],
              ["Updated", "1 Mar 2026"],
              ["Parts", String(PARTS.length)],
              ["Sections", String(TOTAL_SECTIONS)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] uppercase tracking-wide text-[#9d825c]">{label}</dt>
              <dd className="text-sm font-semibold text-[#2d2011]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9d825c]"
          strokeWidth={1.8}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sections, tags, or keywords…"
          className="w-full rounded-md border border-[#ccb68f] bg-[#fffdf7]/80 py-2.5 pl-9 pr-9 text-sm text-[#2b2419] shadow-inner placeholder:text-[#9d825c] focus:outline-none focus:ring-2 focus:ring-[#8b6f3d]/30"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9d825c] transition-colors hover:text-[#4a2e0f]"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Table of Contents — horizontal tabs */}
      {!isSearching && (
        <nav aria-label="Act parts" className="mb-6 -mx-0.5 overflow-x-auto pb-1">
          <div className="flex gap-1.5 px-0.5">
            {PARTS.map((part, index) => (
              <button
                key={part.id}
                onClick={() => goToPart(index)}
                className={`flex shrink-0 flex-col rounded-md border px-3 py-2 text-left transition-colors ${
                  index === activePartIndex
                    ? "border-[#a07840] bg-[#efe3cd] text-[#2d1e0a]"
                    : "border-[#cdb890]/50 bg-[#fffdf7]/40 text-[#5a4a32] hover:bg-[#f5edd8]"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                    index === activePartIndex ? "text-[#7a5e35]" : "text-[#9d825c]"
                  }`}
                >
                  {part.label}
                </span>
                <span className="mt-0.5 max-w-[148px] text-xs leading-snug">{part.title}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ── Search results view ── */}
      {isSearching ? (
        <div>
          <p className="mb-4 text-xs uppercase tracking-wide text-[#7a6040]">
            {searchResults.length > 0
              ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} found`
              : "No sections match your search."}
          </p>
          {searchResults.map((offence) => (
            <article
              key={offence.code}
              id={`section-${offence.code}`}
              className="scroll-mt-20 border-b border-[#e0cda9] py-4 last:border-0"
            >
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 font-mono text-sm font-bold text-[#8b6f3d]">
                  {offence.code}
                </span>
                <div>
                  <p className="mb-0.5 text-[10px] uppercase tracking-wide text-[#9d825c]">
                    {offence.partLabel} &middot; {offence.tag}
                  </p>
                  <h3
                    className="text-base font-semibold text-[#1f1a14]"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {offence.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#4a3d2a]">
                    {offence.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* ── Chapter / book view ── */
        <div ref={chapterRef}>
          {/* Reading progress bar */}
          <div className="mb-5 h-0.5 w-full overflow-hidden rounded-full bg-[#e8d8bb]/80">
            <div
              className="h-full bg-[#8b6f3d]/60 transition-all duration-300"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Chapter heading */}
          <header className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8b6f3d]">
              {activePart.label}
            </p>
            <h2
              className="mt-1 text-2xl font-bold leading-tight text-[#1f1a14] sm:text-3xl"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {activePart.title}
            </h2>
            <p className="mt-1 text-xs text-[#7a6545]">
              {activePart.offences.length} section
              {activePart.offences.length !== 1 ? "s" : ""}
            </p>
          </header>

          {/* Sections — fade-in on chapter change */}
          <div key={activePartIndex} className={scrollStyles.fadeIn}>
            {activePart.offences.map((offence, i) => {
              const isExpanded = expandedSections.has(offence.code);
              const isBookmarked = bookmarks.includes(offence.code);
              const wasCopied = copied === offence.code;

              return (
                <article
                  key={offence.code}
                  id={`section-${offence.code}`}
                  className={`scroll-mt-20 border-[#e0cda9] py-4 ${i === 0 ? "border-t" : ""} border-b last:border-b-0`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Section number */}
                    <span className="mt-0.5 w-9 shrink-0 font-mono text-sm font-bold text-[#8b6f3d]">
                      {offence.code}
                    </span>

                    {/* Section body */}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => toggleSection(offence.code)}
                        className="group flex w-full items-start justify-between gap-2 text-left"
                        aria-expanded={isExpanded}
                        aria-controls={`section-body-${offence.code}`}
                      >
                        <h3
                          className="text-base font-semibold leading-snug text-[#1f1a14] transition-colors group-hover:text-[#5a3518] sm:text-lg"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {offence.title}
                        </h3>
                        <ChevronDown
                          className={`mt-1 h-4 w-4 shrink-0 text-[#9d825c] transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.8}
                        />
                      </button>

                      {isExpanded && (
                        <div
                          id={`section-body-${offence.code}`}
                          className="mt-3 border-l-2 border-[#d4b87a]/50 pl-4"
                        >
                          <p
                            className="text-sm leading-relaxed text-[#4a3d2a] sm:text-base"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            {offence.description}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span className="rounded-full border border-[#cdb890] bg-[#f5edd8]/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a5e35]">
                              {offence.tag}
                            </span>
                            <button
                              onClick={() => copyLink(offence.code)}
                              className="flex items-center gap-1 text-xs text-[#9d825c] transition-colors hover:text-[#4a2e0f]"
                              title="Copy link to this section"
                            >
                              {wasCopied ? (
                                <>
                                  <Check className="h-3 w-3" strokeWidth={2.2} />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Link2 className="h-3 w-3" strokeWidth={1.8} />
                                  Copy link
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleBookmark(offence.code)}
                              className="flex items-center gap-1 text-xs text-[#9d825c] transition-colors hover:text-[#4a2e0f]"
                              title={isBookmarked ? "Remove bookmark" : "Bookmark this section"}
                            >
                              {isBookmarked ? (
                                <>
                                  <BookmarkCheck
                                    className="h-3 w-3 text-[#7a5418]"
                                    strokeWidth={1.8}
                                  />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <Bookmark className="h-3 w-3" strokeWidth={1.8} />
                                  Bookmark
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Bookmarks panel */}
          {bookmarks.length > 0 && (
            <div className="mt-6 rounded-md border border-[#cdb890]/60 bg-[#fffef8]/50 px-4 py-3">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a5e35]">
                Bookmarks
              </p>
              <div className="flex flex-wrap gap-2">
                {bookmarks.map((code) => {
                  const part = PARTS.find((p) => p.offences.some((o) => o.code === code));
                  const offence = part?.offences.find((o) => o.code === code);
                  if (!offence || !part) return null;
                  return (
                    <button
                      key={code}
                      onClick={() => {
                        const partIndex = PARTS.indexOf(part);
                        goToPart(partIndex);
                        setExpandedSections(new Set([code]));
                        setTimeout(() => {
                          document
                            .getElementById(`section-${code}`)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 200);
                      }}
                      className="flex items-center gap-1.5 rounded border border-[#cdb890] bg-[#f5edd8] px-2.5 py-1 text-xs text-[#5a3e22] transition-colors hover:bg-[#efe3cd]"
                    >
                      <span className="font-mono text-[10px] text-[#8b6f3d]">{code}</span>
                      {offence.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chapter navigation */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#d4c5a4] pt-5">
            <button
              onClick={() => navigatePart(-1)}
              disabled={activePartIndex === 0}
              className="flex items-center gap-1.5 rounded-md border border-[#cdb890] bg-[#fffdf7] px-3 py-2 text-sm text-[#5a4a32] transition-colors hover:bg-[#efe3cd] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Previous Part</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <span className="text-xs text-[#9d825c]">
              {activePartIndex + 1}&thinsp;/&thinsp;{PARTS.length}
            </span>

            <button
              onClick={() => navigatePart(1)}
              disabled={activePartIndex === PARTS.length - 1}
              className="flex items-center gap-1.5 rounded-md border border-[#cdb890] bg-[#fffdf7] px-3 py-2 text-sm text-[#5a4a32] transition-colors hover:bg-[#efe3cd] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="hidden sm:inline">Next Part</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
