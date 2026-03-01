import { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  className?: string;
};

export default function Icon({ icon: IconComponent, className }: Props) {
  return <IconComponent className={`h-5 w-5 shrink-0 ${className ?? ""}`} strokeWidth={1.8} />;
}
