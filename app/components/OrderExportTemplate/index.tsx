import { useChangeData } from "app/hook/useChangeData";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  UniqueIdentifier,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================= TYPES ================= */

type Order = {
  name: string;
  email: string;
  old: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
};

type ColumnKey = keyof Order;

type Column = {
  key: ColumnKey;
  label: string;
};

/* ================= ALL FIELDS ================= */

const ALL_FIELDS: Column[] = [
  { key: "name", label: "Order Name" },
  { key: "phone", label: "Phone" },
  { key: "old", label: "Age" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "zip", label: "Zip Code" },
];

/* ================= SORTABLE HEADER ================= */

function SortableHeader({ id, label }: { id: string; label: string }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    alignItems: "center",
    gap: 6,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          userSelect: "none",
          fontSize: 16,
        }}
        title="Drag column"
      >
        ≡
      </span>
      {label}
    </div>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function OrderExportTemplate() {
  const storeName = useChangeData<string>();
  const selectedField = useChangeData<string>();

  useEffect(() => {
    console.log("Store name:", storeName);
  }, [storeName]);

  const orderList: Order[] = [
    {
      name: "John Smith",
      email: "john@example.com",
      old: "40",
      phone: "123-456-7890",
      address: "123 Main St",
      city: "New York",
      country: "US",
      zip: "10001",
    },
    {
      name: "Jane Johnson",
      email: "jane@example.com",
      old: "23",
      phone: "122-456-7890",
      address: "45 Lake View",
      city: "Toronto",
      country: "CA",
      zip: "M4B1B3",
    },
  ];

  const [columns, setColumns] = useState<Column[]>([
    { key: "name", label: "Order Name" },
    { key: "phone", label: "Phone" },
    { key: "old", label: "Age" },
    { key: "email", label: "Email" },
  ]);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  /* ===== AVAILABLE FIELDS ===== */
  const availableFields = useMemo(
    () => ALL_FIELDS.filter((f) => !columns.some((c) => c.key === f.key)),
    [columns]
  );

  /* ===== DRAG HANDLERS ===== */
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setColumns((prev) => {
      const oldIndex = prev.findIndex((c) => c.key === active.id);
      const newIndex = prev.findIndex((c) => c.key === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const activeColumn = columns.find((c) => c.key === activeId);

  return (
    <>
      <s-modal id="add-field-modal" heading="Add field">
        <s-select
          label="Field"
          value={selectedField.value}
          onChange={selectedField.handleChange}
        >
          <s-option value="">Select field</s-option>

          {availableFields.map((field) => (
            <s-option key={field.key} value={field.key}>
              {field.label}
            </s-option>
          ))}
        </s-select>

        <s-button slot="secondary-actions" commandFor="add-field-modal" command="--hide">
          Cancel
        </s-button>

        <s-button
          slot="primary-action"
          variant="primary"
          disabled={!selectedField.value}
          commandFor="add-field-modal"
          command="--hide"
          onClick={() => {
            const field = ALL_FIELDS.find((f) => f.key === selectedField.value);
            if (field) setColumns((prev) => [...prev, field]);
          }}
        >
          Add
        </s-button>
      </s-modal>
      <s-stack gap="base">
        <s-box>
          <s-section>
            <s-text-field
              label="Order Export Template Name"
              value={storeName.value}
              onInput={storeName.handleChange}
            />
          </s-section>
        </s-box>

        <s-box>
          <s-section>
            <s-stack gap="base">
              <s-box>
                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-button commandFor="add-field-modal" command="--show">
                    Add field
                  </s-button>

                  <s-button variant="primary" onClick={() => console.log("Download success")}>
                    Download CSV
                  </s-button>
                </s-stack>
              </s-box>
              <DndContext
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #e1e3e5",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          background: "#f6f6f7",
                          padding: 8,
                          borderBottom: "1px solid #e1e3e5",
                        }}
                      >
                        Column name
                      </th>

                      <SortableContext
                        items={columns.map((c) => c.key)}
                        strategy={horizontalListSortingStrategy}
                      >
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            style={{
                              background: "#f6f6f7",
                              padding: 8,
                              borderBottom: "1px solid #e1e3e5",
                            }}
                          >
                            <SortableHeader
                              id={col.key}
                              label={col.label}
                            />
                          </th>
                        ))}
                      </SortableContext>
                    </tr>
                  </thead>

                  <tbody>
                    {orderList.map((order, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          Row {i + 1}
                        </td>

                        {columns.map((col) => (
                          <td
                            key={col.key}
                            style={{
                              padding: 8,
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            {order[col.key] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ===== DRAG OVERLAY ===== */}
                <DragOverlay>
                  {activeColumn ? (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "#fff",
                        boxShadow: "0 8px 24px rgba(0,0,0,.15)",
                        borderRadius: 6,
                        opacity: 0.9,
                      }}
                    >
                      ≡ {activeColumn.label}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </s-stack>
          </s-section>
        </s-box>
      </s-stack>
    </>
  );
}
