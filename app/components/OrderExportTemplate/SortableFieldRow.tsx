import { ColumnFieldOrder, OrderField } from "app/config";
import { CSS } from "@dnd-kit/utilities";


function SortableFieldRow({
    column,
    orders,
    getStaticValue,
  }: {
    column: ColumnFieldOrder;
    orders: OrderField[];
    getStaticValue: any
  }) {
    const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: column.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    console.log("orders", orders)

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
                  normalizePathForRead(column.path).replace(/^raw\./, ""),
                );

          return (
            <td
              key={i}
              className="td-value"
              title={formatCellValue(value)}
            >
              {formatCellValue(value)}
            </td>
          );
        })}

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
  }

export default SortableFieldRow