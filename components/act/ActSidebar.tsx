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
      <div className="mb-10 lg:hidden">
        <label htmlFor="act-nav" className="mb-2 block text-sm text-[#6b6b6b]">
          Jump to chapter
        </label>
        <select
          id="act-nav"
          defaultValue=""
          onChange={(event) => {
            if (event.target.value) {
              jumpToSection(event.target.value);
            }
          }}
          className="w-full rounded-md border border-[#e4e2dd] bg-white px-3 py-3 text-sm text-[#1c1c1c] focus:outline-none focus:ring-2 focus:ring-[#8b6f3d]/40"
        >
          <option value="" disabled>
            Select a chapter
          </option>
          {links.map((link) => (
            <option key={link.id} value={link.id}>
              {link.label}
            </option>
          ))}
        </select>
      </div>

      <aside className="sticky top-24 hidden h-fit w-72 self-start lg:block">
        <nav aria-label="Act parts" className="space-y-1 border-l border-[#e4e2dd] pl-5 text-sm">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="block rounded-r-md py-2 text-[#6b6b6b] transition-colors hover:bg-[#f1ece1] hover:text-[#1c1c1c]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
