import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ColumnFieldOrder, OrderField } from "app/config";

type Props = {
  column: ColumnFieldOrder;
  orders: OrderField[];
};


const normalizePathForRead = (path: string) => {
  return path.replaceAll("[]", "[0]");
};

const formatCellValue = (value: unknown): string => {
  if (value == null) return "-";
  if (typeof value === "string") return value || "-";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  if (typeof value === "boolean") return value ? "true" : "false";

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getByPath = (input: unknown, path: string): unknown => {
  if (!path) return undefined;

  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  let cur: any = input;

  for (const part of parts) {
    if (cur == null) return undefined;

    const match = /^(.+?)\[(\d+)\]$/.exec(part);
    if (match) {
      const key = match[1];
      const index = Number(match[2]);
      cur = cur?.[key];
      if (!Array.isArray(cur)) return undefined;
      cur = cur[index];
      continue;
    }

    cur = cur?.[part];
  }

  return cur;
};

const getStaticValue = (path: string) => {
  if (path === "__static.exportedTimestamp") {
    return new Date().toISOString();
  }
  return undefined;
};


const SortableFieldRow = memo(({ column, orders }: Props) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`sortable-row ${isDragging ? "is-dragging" : ""}`}
    >
      <td className="td-field" title={column.label}>
        <span
          {...attributes}
          {...listeners}
          className="drag-handle"
          title="Drag field"
        >
          ≡
        </span>
        {column.label}
      </td>

      {orders.map((order, i) => {
        const staticValue = getStaticValue(column.path);

        const value =
          staticValue !== undefined
            ? staticValue
            : getByPath(
                order?.raw as any,
                normalizePathForRead(column.path).replace(/^raw\./, "")
              );

        const formattedValue = formatCellValue(value);

        return (
          <td
            key={i}
            className="td-value"
            title={formattedValue}
          >
            {formattedValue}
          </td>
        );
      })}

      {/* ===== Action ===== */}
      <td className="td-action">
        <button
          className="action-btn"
          onClick={() => console.log("Edit field:", column)}
          title="Edit field"
        >
          ✏️
        </button>
      </td>
    </tr>
  );
});

export default SortableFieldRow;
