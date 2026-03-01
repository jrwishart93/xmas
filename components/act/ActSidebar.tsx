const links = [
  { id: "part-1", label: "Part I – Administrative" },
  { id: "part-2", label: "Part II – Life Events" },
  { id: "part-3", label: "Part III – Operational" },
];

export default function ActSidebar() {
  return (
    <aside className="sticky top-32 hidden h-fit w-64 self-start lg:block">
      <nav aria-label="Act parts" className="space-y-4 border-l border-neutral-200 pl-4 text-sm">
        {links.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            className="block text-neutral-500 transition-colors hover:text-black"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
