"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ActOffenceCard from "./ActOffenceCard";

type Offence = {
  code: string;
  title: string;
  description: string;
  tag: string;
};

type Part = {
  id: string;
  title: string;
  offences: Offence[];
};

const parts: Part[] = [
  {
    id: "part-1",
    title: "Part I – Administrative & Attendance Breaches",
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
    title: "Part II – Life Events & Ceremonial Obligations",
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
    title: "Part III – Operational & Conduct Matters",
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

export default function ActPart() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").toLowerCase();
  const [open, setOpen] = useState<Record<string, boolean>>({
    "part-1": true,
    "part-2": true,
    "part-3": true,
  });

  const filteredParts = useMemo(
    () =>
      parts
        .map((part) => ({
          ...part,
          offences: part.offences.filter((offence) => {
            if (!query) return true;
            const source = `${offence.code} ${offence.title} ${offence.description} ${offence.tag}`.toLowerCase();
            return source.includes(query);
          }),
        }))
        .filter((part) => part.offences.length > 0),
    [query],
  );

  if (!filteredParts.length) {
    return <p className="text-[#6b6b6b]">No offences match your search.</p>;
  }

  return (
    <div>
      {filteredParts.map((part, index) => {
        const isOpen = open[part.id] ?? true;

        return (
          <section key={part.id} id={part.id} className="mb-16 scroll-mt-24">
            <button
              onClick={() => setOpen((previous) => ({ ...previous, [part.id]: !isOpen }))}
              className="w-full text-left"
              aria-expanded={isOpen}
              aria-controls={`${part.id}-offences`}
            >
              <h2 className="flex items-center justify-between text-2xl font-semibold tracking-[0.01em] text-[#1c1c1c]">
                {part.title}
                <span className="text-lg text-[#6b6b6b]">{isOpen ? "−" : "+"}</span>
              </h2>
            </button>

            <div className="mt-5 h-px bg-[#e4e2dd]" />

            <div
              id={`${part.id}-offences`}
              className={`grid transition-all duration-300 ${
                isOpen ? "mt-8 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                {part.offences.map((offence) => (
                  <ActOffenceCard key={offence.code} {...offence} />
                ))}
              </div>
            </div>

            {index < filteredParts.length - 1 && <div className="mt-4 h-px bg-[#e4e2dd]" />}
          </section>
        );
      })}
    </div>
  );
}
