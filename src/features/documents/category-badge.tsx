import { Badge } from "@/components/ui/primitives";
import { toTone } from "@/components/ui/icons";

export function DocCategoryBadge({ name, color }: { name: string; color: string }) {
  return <Badge tone={toTone(color)}>{name}</Badge>;
}
