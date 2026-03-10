import actData from "@/data/act.json";

export type ActSection = {
  code: string;
  title: string;
  description: string;
  amountGBP: number;
  amountPence: number;
  latePenaltyMultiplier: number;
  latePenaltyAfterDays: number;
};

export type ActPart = {
  partNumber: number;
  title: string;
  operationallySensitive: boolean;
  sections: ActSection[];
};

export type ActDocument = {
  title: string;
  version: string;
  lastUpdated: string;
  parts: ActPart[];
};

export const ACT_DOCUMENT = actData as ActDocument;

export function formatActDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatWholePounds(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getActStats(document: ActDocument = ACT_DOCUMENT) {
  const sections = document.parts.flatMap((part) => part.sections);
  const totalSections = sections.length;
  const highestContribution = Math.max(...sections.map((section) => section.amountGBP), 0);
  const averageContribution =
    totalSections > 0
      ? sections.reduce((sum, section) => sum + section.amountGBP, 0) / totalSections
      : 0;

  return {
    totalParts: document.parts.length,
    totalSections,
    highestContribution,
    averageContribution,
  };
}
