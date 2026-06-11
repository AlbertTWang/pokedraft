import { TYPE_COLORS, typeLabel } from "../game/typeColors";
import type { TypeName } from "../game/types";

export function TypeBadge({ type, large = false }: { type: TypeName; large?: boolean }) {
  return (
    <span
      className={large ? "type-badge type-badge--large" : "type-badge"}
      style={{ backgroundColor: TYPE_COLORS[type] }}
    >
      {typeLabel(type)}
    </span>
  );
}
