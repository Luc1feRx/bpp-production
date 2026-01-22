import { useChangeData } from "app/hook/useChangeData";
import { useEffect, useMemo, useRef, useState } from "react";
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

export type Order = {
  id: string;
  adminGid: string;
  name: string | null;
  createdAt: string;
  processedAt: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: number | null;
  currencyCode: string | null;
  raw?: any;
};

type Column = {
  id: string;
  label: string;
  path: string;
};

type FieldOption = {
  label: string;
  path: string;
};

/* ================= DEFAULT FIELDS ================= */

const DEFAULT_FIELDS: Column[] = [
  { id: "name", label: "Order Name", path: "raw.name" },
  { id: "createdAt", label: "Order Created Date", path: "raw.created_at" },
  { id: "financialStatus", label: "Financial Status", path: "raw.financial_status" },
  { id: "totalPrice", label: "Subtotal Price Set", path: "raw.subtotal_price_set.shop_money.amount" },
];

function getByPath(input: unknown, path: string): unknown {
  if (!path) return undefined;

  const parts = path
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  let cur: any = input;

  for (const part of parts) {
    if (cur == null) return undefined;

    const m = /^(.+?)\[(\d+)\]$/.exec(part);
    if (m) {
      const key = m[1];
      const idx = Number(m[2]);
      cur = cur?.[key];
      if (!Array.isArray(cur)) return undefined;
      cur = cur[idx];
      continue;
    }

    cur = cur?.[part];
  }

  return cur;
}

function formatCellValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "string") return value || "-";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  if (typeof value === "boolean") return value ? "true" : "false";

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizePathForRead(path: string) {
  return path.replaceAll("[]", "[0]");
}

function buildSyncXFieldCatalogue(): FieldOption[] {
  return [
    // ===== ORDER BASIC =====
    { label: "Order Number", path: "raw.order_number" },
    { label: "Order Name", path: "raw.name" },
    { label: "Order Created Date", path: "raw.created_at" },
    { label: "Order Processed Date", path: "raw.processed_at" },
    { label: "Order Close DateTime", path: "raw.closed_at" },
    { label: "Order Cancelled at", path: "raw.cancelled_at" },
    { label: "Financial Status", path: "raw.financial_status" },
    { label: "Fulfillment Status", path: "raw.fulfillment_status" },
    { label: "Currency", path: "raw.currency" },

    // ===== CUSTOMER / CONTACT =====
    { label: "Email (Order)", path: "raw.email" },
    { label: "Phone (Order)", path: "raw.phone" },
    { label: "Customer Email", path: "raw.customer.email" },
    { label: "Customer First Name", path: "raw.customer.first_name" },
    { label: "Customer Last Name", path: "raw.customer.last_name" },
    { label: "Customer Phone", path: "raw.customer.phone" },

    // ===== CHANNEL / SOURCE =====
    { label: "Sales Channel Name", path: "raw.source_name" },
    { label: "Source Identifier", path: "raw.source_identifier" },
    { label: "Checkout Token (GQL deprecated)", path: "raw.checkout_token" },

    // ===== ADDRESS =====
    { label: "Shipping Name", path: "raw.shipping_address.name" },
    { label: "Shipping Address 1", path: "raw.shipping_address.address1" },
    { label: "Shipping Address 2", path: "raw.shipping_address.address2" },
    { label: "Shipping City", path: "raw.shipping_address.city" },
    { label: "Shipping Province", path: "raw.shipping_address.province" },
    { label: "Shipping Country", path: "raw.shipping_address.country" },
    { label: "Shipping Zip", path: "raw.shipping_address.zip" },
    { label: "Shipping Phone", path: "raw.shipping_address.phone" },

    { label: "Billing Name", path: "raw.billing_address.name" },
    { label: "Billing Address 1", path: "raw.billing_address.address1" },
    { label: "Billing Address 2", path: "raw.billing_address.address2" },
    { label: "Billing City", path: "raw.billing_address.city" },
    { label: "Billing Province", path: "raw.billing_address.province" },
    { label: "Billing Country", path: "raw.billing_address.country" },
    { label: "Billing Zip", path: "raw.billing_address.zip" },
    { label: "Billing Phone", path: "raw.billing_address.phone" },

    // ===== PRICES =====
    { label: "Subtotal Price Set", path: "raw.subtotal_price_set.shop_money.amount" },
    { label: "Total Price Presentment Amount", path: "raw.total_price_set.presentment_money.amount" },
    { label: "Total Tax Presentment Amount", path: "raw.total_tax_set.presentment_money.amount" },

    // ===== NOTE / ATTRIBUTES =====
    { label: "Note", path: "raw.note" },
    { label: "Note Attribute 1 Name", path: "raw.note_attributes[0].name" },
    { label: "Note Attribute 1 Value", path: "raw.note_attributes[0].value" },
    { label: "Note Attribute 2 Name", path: "raw.note_attributes[1].name" },
    { label: "Note Attribute 2 Value", path: "raw.note_attributes[1].value" },
    { label: "Note Attribute 3 Name", path: "raw.note_attributes[2].name" },
    { label: "Note Attribute 3 Value", path: "raw.note_attributes[2].value" },

    // ===== LINE ITEMS (sample item 1) =====
    { label: "Order Line item Properties 1 Name", path: "raw.line_items[0].properties[0].name" },
    { label: "Order Line item Properties 1 Value", path: "raw.line_items[0].properties[0].value" },
    { label: "Order Line item Properties 2 Name", path: "raw.line_items[0].properties[1].name" },
    { label: "Order Line item Properties 2 Value", path: "raw.line_items[0].properties[1].value" },
    { label: "Order Line item Properties 3 Name", path: "raw.line_items[0].properties[2].name" },
    { label: "Order Line item Properties 3 Value", path: "raw.line_items[0].properties[2].value" },

    // ===== STATIC FIELD =====
    { label: "Exported Timestamp", path: "__static.exportedTimestamp" },

    // ===== DEPRECATED (GQL) =====
    { label: "Token (GQL deprecated)", path: "raw.token" },
    { label: "Cart Token (GQL deprecated)", path: "raw.cart_token" },
    { label: "Referring Site (GQL deprecated)", path: "raw.referring_site" },
    { label: "Landing Site (GQL deprecated)", path: "raw.landing_site" },

    // ===== MISC (từ screenshot) =====
    { label: "Test", path: "raw.test" },
    { label: "User ID (GQL deprecated)", path: "raw.user_id" },
  ];
}

function getStaticValue(path: string) {
  if (path === "__static.exportedTimestamp") return new Date().toISOString();
  return undefined;
}

function includesSearch(haystack: string, needle: string) {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

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

export default function OrderExportTemplate({
  orders,
}: {
  orders: Order[];
}) {
  const storeName = useChangeData<string>();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    console.log("Store name:", storeName);
  }, [storeName]);

  const orderList: Order[] = orders;

  const [columns, setColumns] = useState<Column[]>(DEFAULT_FIELDS);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const fieldCatalogue = useMemo(() => {
    return buildSyncXFieldCatalogue();
  }, []);

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  const availableFields = useMemo(() => {
    const existing = new Set(columns.map((c) => c.path));

    return fieldCatalogue
      .filter((f) => !existing.has(f.path))
      .filter((f) => !selectedSet.has(f.path))
      .filter((f) => includesSearch(f.label, query));
  }, [columns, fieldCatalogue, query, selectedSet]);

  const selectedOptions = useMemo(() => {
    const map = new Map(fieldCatalogue.map((f) => [f.path, f]));
    return selectedPaths.map((p) => map.get(p)).filter(Boolean) as FieldOption[];
  }, [fieldCatalogue, selectedPaths]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setColumns((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const activeColumn = columns.find((c) => c.id === activeId);

  const addPath = (path: string) => {
    setSelectedPaths((prev) => dedupe([...prev, path]));
    setQuery("");
  };

  const removePath = (path: string) => {
    setSelectedPaths((prev) => prev.filter((p) => p !== path));
  };

  const clearPicker = () => {
    setSelectedPaths([]);
    setQuery("");
    setIsOpen(false);
  };

  const saveToColumns = () => {
    if (!selectedPaths.length) return;

    setColumns((prev) => {
      const existing = new Set(prev.map((c) => c.path));
      const next: Column[] = [...prev];

      for (const path of selectedPaths) {
        const trimmed = (path ?? "").trim();
        if (!trimmed) continue;
        if (existing.has(trimmed)) continue;

        const label = fieldCatalogue.find((f) => f.path === trimmed)?.label ?? trimmed;
        const nextId = `${trimmed}-${next.length + 1}`;

        next.push({ id: nextId, label, path: trimmed });
        existing.add(trimmed);
      }

      return next;
    });

    clearPicker();
  };

  return (
    <div style={{height: '1000px'}}>
      <s-modal id="add-field-modal" heading="Add export fields">
        <s-stack gap="base">
          <s-box>
            <div
              style={{
                border: "1px solid #c9cccf",
                borderRadius: 10,
                padding: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                position: "relative",
              }}
              onClick={() => {
                setIsOpen(true);
                inputRef.current?.focus();
              }}
            >
              {selectedOptions.map((opt) => (
                <div
                  key={opt.path}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: "#f1f2f3",
                    border: "1px solid #d5d7da",
                    fontSize: 14,
                  }}
                >
                  <span>{opt.label}</span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removePath(opt.path);
                    }}
                    aria-label={`Remove ${opt.label}`}
                  >
                    ×
                  </button>
                </div>
              ))}

              <input
                ref={inputRef as any}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={selectedOptions.length ? "" : "Please select input field to added"}
                style={{
                  flex: 1,
                  minWidth: 180,
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  padding: 6,
                }}
              />

              <div style={{ marginLeft: "auto", padding: 6, color: "#6d7175" }}>▾</div>

              {isOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    marginTop: 6,
                    background: "#fff",
                    border: "1px solid #c9cccf",
                    borderRadius: 10,
                    maxHeight: 260,
                    overflow: "auto",
                  }}
                >
                  {availableFields.length ? (
                    availableFields.map((f) => (
                      <div
                        key={f.path}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #eef0f2",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addPath(f.path);
                        }}
                      >
                        {f.label}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "10px 12px", color: "#6d7175" }}>
                      No results
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </s-box>
        </s-stack>

        <s-button slot="secondary-actions" commandFor="add-field-modal" command="--hide" onClick={() => clearPicker()}>
          Cancel
        </s-button>

        <s-button
          slot="primary-action"
          variant="primary"
          disabled={!selectedPaths.length}
          commandFor="add-field-modal"
          command="--hide"
          onClick={() => saveToColumns()}
        >
          Save
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
                        items={columns.map((c) => c.id)}
                        strategy={horizontalListSortingStrategy}
                      >
                        {columns.map((col) => (
                          <th
                            key={col.id}
                            style={{
                              background: "#f6f6f7",
                              padding: 8,
                              borderBottom: "1px solid #e1e3e5",
                            }}
                          >
                            <SortableHeader id={col.id} label={col.label} />
                          </th>
                        ))}
                      </SortableContext>
                    </tr>
                  </thead>

                  <tbody>
                    {orderList.map((order, i) => (
                      <tr key={order.id ?? i}>
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          Row {i + 1}
                        </td>

                        {columns.map((col) => {
                          const staticValue = getStaticValue(col.path);
                          const value =
                            staticValue !== undefined
                              ? staticValue
                              : getByPath(
                                  order?.raw as any,
                                  normalizePathForRead(col.path).replace(/^raw\./, ""),
                                );

                          return (
                            <td
                              key={col.id}
                              style={{
                                padding: 8,
                                borderBottom: "1px solid #f0f0f0",
                              }}
                            >
                              {formatCellValue(value)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

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
    </div>
  );
}
