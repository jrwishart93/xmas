"use client";

const links = [
  { id: "part-1", label: "Part I – Administrative" },
  { id: "part-2", label: "Part II – Life Events" },
  { id: "part-3", label: "Part III – Operational" },
];

function jumpToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ActSidebar() {
  return (
    <>
      <div className="mb-2 lg:hidden">
        <label htmlFor="act-nav" className="mb-2 block text-xs uppercase tracking-[0.14em] text-[#6e5d42]">
          Browse parts
        </label>
        <select
          id="act-nav"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              jumpToSection(event.target.value);
            }
          }}
          className="w-full rounded-md border border-[#cdb890] bg-[#fdfaf2] px-3 py-3 text-sm text-[#2d2416] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8b6f3d]/40"
        >
          <option value="" disabled>
            Select a part
          </option>
          {links.map((link) => (
            <option key={link.id} value={link.id}>
              {link.label}
            </option>
          ))}
        </select>
      </div>

      <aside className="sticky top-24 hidden h-fit w-72 self-start overflow-hidden rounded-md border border-[#d4c19d] bg-[#f8f3e6] lg:block">
        <div className="border-b border-[#d4c19d] bg-[#efe3cd] px-5 py-4 text-xs uppercase tracking-[0.16em] text-[#5a4626]">
          Table of Parts
        </div>
        <nav aria-label="Act parts" className="space-y-1 p-3 text-sm">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="block rounded-sm border border-transparent px-3 py-2 text-[#5b4b33] transition-colors hover:border-[#d5bf94] hover:bg-[#efe3cd] hover:text-[#231c12]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
