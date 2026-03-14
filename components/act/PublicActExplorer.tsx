"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Filter, Search } from "lucide-react";

import styles from "@/components/act/PublicActExplorer.module.css";
import type { ActDocument, ActPart } from "@/lib/act";
import { formatWholePounds } from "@/lib/act";

type PublicActExplorerProps = {
  document: ActDocument;
};

export default function PublicActExplorer({ document }: PublicActExplorerProps) {
  const [query, setQuery] = useState("");
  const [partFilter, setPartFilter] = useState<number | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredParts = useMemo(() => {
    return document.parts
      .filter((part) => partFilter === null || part.partNumber === partFilter)
      .map((part) => ({
        ...part,
        sections: part.sections.filter((section) => {
          if (!normalizedQuery) return true;

          const haystack = `${section.code} ${section.title} ${section.description}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        }),
      }))
      .filter((part) => part.sections.length > 0);
  }, [document.parts, normalizedQuery, partFilter]);

  const visibleSectionCount = filteredParts.reduce(
    (count, part) => count + part.sections.length,
    0,
  );

  return (
    <section className={styles.explorer}>
      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Search the Act</span>
          <span className={styles.searchInputWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try a section code, title, or keyword"
              className={styles.searchInput}
            />
          </span>
        </label>

        <div className={styles.filterWrap}>
          <p className={styles.filterLabel}>
            <Filter size={16} />
            Narrow by part
          </p>
          <div className={styles.filterRow}>
            <button
              type="button"
              onClick={() => setPartFilter(null)}
              className={`${styles.filterButton} ${partFilter === null ? styles.filterButtonActive : ""}`}
            >
              All parts
            </button>
            {document.parts.map((part) => (
              <button
                key={part.partNumber}
                type="button"
                onClick={() => setPartFilter(part.partNumber)}
                className={`${styles.filterButton} ${partFilter === part.partNumber ? styles.filterButtonActive : ""}`}
              >
                Part {part.partNumber}
                <span className={styles.filterBadge}>{part.sections.length}</span>
              </button>
            ))}
          </div>
        </div>

        <p className={styles.resultMeta}>
          Showing {visibleSectionCount}{" "}
          {visibleSectionCount === 1 ? "section" : "sections"} across {filteredParts.length}{" "}
          {filteredParts.length === 1 ? "part" : "parts"}.
        </p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <p className={styles.sidebarEyebrow}>Contents</p>
            <nav className={styles.sidebarNav} aria-label="Act contents">
              {filteredParts.map((part) => (
                <a key={part.partNumber} href={`#part-${part.partNumber}`} className={styles.sidebarLink}>
                  <span>Part {part.partNumber}</span>
                  <small>{part.sections.length} sections</small>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className={styles.parts}>
          {filteredParts.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>No results found</h2>
              <p>Try a different search term, or clear your filters to browse the full Act.</p>
              <button
                type="button"
                className={styles.emptyStateReset}
                onClick={() => { setQuery(""); setPartFilter(null); }}
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredParts.map((part) => (
              <PartCard key={part.partNumber} part={part} searchActive={Boolean(normalizedQuery)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function PartCard({
  part,
  searchActive,
}: {
  part: ActPart;
  searchActive: boolean;
}) {
  return (
    <article id={`part-${part.partNumber}`} className={styles.partCard}>
      <div className={styles.partHeader}>
        <div>
          <p className={styles.partEyebrow}>Part {part.partNumber}</p>
          <h2 className={styles.partTitle}>{part.title}</h2>
        </div>
        {part.operationallySensitive ? (
          <span className={styles.partTag}>Operationally sensitive</span>
        ) : (
          <span className={styles.partTagMuted}>Standard section</span>
        )}
      </div>

      <div className={styles.sectionList}>
        {part.sections.map((section) => (
          <section key={section.code} id={`section-${section.code}`} className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionCode}>{section.code}</p>
                <h3 className={styles.sectionTitle}>{section.title}</h3>
              </div>
              <a href={`#section-${section.code}`} className={styles.anchorLink} aria-label={`Link to section ${section.code}`}>
                <ExternalLink size={16} />
              </a>
            </div>

            <p className={styles.sectionDescription}>{section.description}</p>

            <div className={styles.sectionMeta}>
              <span>{formatWholePounds(section.amountGBP)} standard amount</span>
              <span>Adjustment x{section.latePenaltyMultiplier}</span>
              <span>After {section.latePenaltyAfterDays} days</span>
              {searchActive ? <span>Matched result</span> : null}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
