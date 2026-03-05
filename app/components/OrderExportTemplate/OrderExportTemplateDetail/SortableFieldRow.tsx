// import { memo, useMemo } from "react";
// import { useSortable } from "@dnd-kit/sortable";
// import { CSS } from "@dnd-kit/utilities";
// import { ColumnFieldOrder, OrderField } from "app/config";

// type Props = {
//   column: ColumnFieldOrder;
//   orders: OrderField[];
//   exportedTimestamp: string;
// };

// const normalizePathForRead = (path: string) => {
//   return path.replaceAll("[]", "[0]");
// };

// const formatCellValue = (value: unknown): string => {
//   if (value == null) return "-";
//   if (typeof value === "string") return value || "-";
//   if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
//   if (typeof value === "boolean") return value ? "true" : "false";

//   try {
//     return JSON.stringify(value);
//   } catch {
//     return String(value);
//   }
// };

// const getByPath = (input: unknown, path: string): unknown => {
//   if (!path) return undefined;

//   const parts = path
//     .split(".")
//     .map((p) => p.trim())
//     .filter(Boolean);

//   let cur: any = input;

//   for (const part of parts) {
//     if (cur == null) return undefined;

//     const match = /^(.+?)\[(\d+)\]$/.exec(part);
//     if (match) {
//       const key = match[1];
//       const index = Number(match[2]);
//       cur = cur?.[key];
//       if (!Array.isArray(cur)) return undefined;
//       cur = cur[index];
//       continue;
//     }

//     cur = cur?.[part];
//   }

//   return cur;
// };

// const getStaticValue = (
//   path: string,
//   exportedTimestamp: string
// ) => {
//   if (path === "__static.exportedTimestamp") {
//     return exportedTimestamp;
//   }
//   return undefined;
// };


// const SortableFieldRow = memo(({ column, orders, exportedTimestamp }: Props) => {
//   const {
//     setNodeRef,
//     attributes,
//     listeners,
//     transform,
//     transition,
//     isDragging,
//   } = useSortable({ id: column.id });

//   const style: React.CSSProperties = {
//     transform: CSS.Transform.toString(transform),
//     transition,
//   };

//   return (
//     <tr
//       ref={setNodeRef}
//       style={style}
//       className={`sortable-row ${isDragging ? "is-dragging" : ""} pt-6`}
//     >
//       <td className="td-field" title={column.label}>
//         <span
//           {...attributes}
//           {...listeners}
//           className="drag-handle"
//           title="Drag field"
//         >
//           ≡
//         </span>
//         {column.label}
//       </td>

//       {orders.map((order, i) => {
//         const staticValue = getStaticValue(column.path, exportedTimestamp);

//         const value =
//           staticValue !== undefined
//             ? staticValue
//             : getByPath(
//                 order?.raw as any,
//                 normalizePathForRead(column.path).replace(/^raw\./, "")
//               );

//         const formattedValue = formatCellValue(value);

//         return (
//           <td
//             key={i}
//             className="td-value"
//             title={formattedValue}
//           >
//             {formattedValue}
//           </td>
//         );
//       })}

//       {/* ===== Action ===== */}
//       <td className="td-action">
//         <button
//           className="action-btn"
//           onClick={() => console.log("Edit field:", column)}
//           title="Edit field"
//         >
//           ✏️
//         </button>
//       </td>
//     </tr>
//   );
// });

// export default SortableFieldRow;



import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ColumnFieldOrder, OrderField } from "app/config";

type Props = {
  column: ColumnFieldOrder;
  orders: OrderField[];
  exportedTimestamp: string;
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

const getStaticValue = (path: string, exportedTimestamp: string) => {
  if (path === "__static.exportedTimestamp") {
    return exportedTimestamp;
  }
  return undefined;
};

const SortableFieldRow = memo(
  ({ column, orders, exportedTimestamp }: Props) => {
    const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: column.id });

    const rowStyle: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      background: isDragging ? "#f6f6f7" : undefined,
    };

    const styles = {
      tdField: {
        width: 220,
        maxWidth: 220,
        background: "#fafbfb",
        fontWeight: 500,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
        position: "sticky" as const,
        left: 0,
        zIndex: 2,
      },
      tdValue: {
        width: 160,
        maxWidth: 160,
        whiteSpace: "nowrap" as const,
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      tdAction: {
        width: 56,
        textAlign: "center" as const,
      },
      tdBase: {
        padding: 8,
        borderBottom: "1px solid #f0f0f0",
        verticalAlign: "middle" as const,
      },
      dragHandle: {
        cursor: "grab",
        userSelect: "none" as const,
        marginRight: 8,
      },
      actionBtn: {
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: 4,
        fontSize: 14,
      },
    };

    return (
      <tr ref={setNodeRef} style={rowStyle}>
        <td
          style={{ ...styles.tdBase, ...styles.tdField }}
          title={column.label}
        >
          <span
            {...attributes}
            {...listeners}
            style={styles.dragHandle}
            title="Drag field"
          >
            ≡
          </span>
          {column.label}
        </td>

        {orders.map((order, i) => {
          const staticValue = getStaticValue(
            column.path,
            exportedTimestamp
          );

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
              style={{ ...styles.tdBase, ...styles.tdValue }}
              title={formattedValue}
            >
              {formattedValue}
            </td>
          );
        })}

        <td style={{ ...styles.tdBase, ...styles.tdAction }}>
          <button
            style={styles.actionBtn}
            onClick={() => console.log("Edit field:", column)}
            title="Edit field"
          >
            ✏️
          </button>
        </td>
      </tr>
    );
  }
);

export default SortableFieldRow;