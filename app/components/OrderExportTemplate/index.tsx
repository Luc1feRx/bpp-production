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
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import "./order_export_template.css";
import { ColumnFieldOrder, OrderField } from "app/config";
import SortableFieldRow from "./SortableFieldRow";
import { ModalField } from "./ModalField";

/* ================= TYPES ================= */

type FieldOption = {
  label: string;
  path: string;
};

/* ================= DEFAULT FIELDS ================= */

const DEFAULT_FIELDS: ColumnFieldOrder[] = [
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


function includesSearch(haystack: string, needle: string) {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/* ================= MAIN COMPONENT ================= */

export default function OrderExportTemplate({
  orders,
}: {
  orders: OrderField[];
}) {
  const storeName = useChangeData<string>();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [draftSelectedPaths, setDraftSelectedPaths] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    console.log("Store name:", storeName);
  }, [storeName]);

  const orderList: OrderField[] = orders;

  const [columns, setColumns] = useState<ColumnFieldOrder[]>(DEFAULT_FIELDS);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const fieldCatalogue = useMemo(() => {
    return buildSyncXFieldCatalogue();
  }, []);

  const availableFields = useMemo(() => {
    return fieldCatalogue.filter(f =>
      includesSearch(f.label, query)
    );
  }, [fieldCatalogue, query]);


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

  const openAddFieldModal = () => {
    setDraftSelectedPaths(columns.map(c => c.path));
  };


  const handleSaveFields = () => {
    setColumns((prev) => {
      const prevMap = new Map(prev.map((c) => [c.path, c]));

      return draftSelectedPaths
        .map((path) => {
          const existing = prevMap.get(path);
          if (existing) return existing;

          const field = fieldCatalogue.find((f) => f.path === path);
          if (!field) return null;

          return {
            id: `${field.path}`,
            label: field.label,
            path: field.path,
          };
        })
        .filter(Boolean) as ColumnFieldOrder[];
    });

    setQuery("");
  };

  const handleCancelFields = () => {
    setDraftSelectedPaths(columns.map(c => c.path));
    setQuery("");
  };

  const csvEscape = (value: unknown) => {
    if (value == null) return "";
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const normalizeCellValue = (value: unknown) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    return JSON.stringify(value);
  };

  const buildCSV = () => {
    const headers = columns.map((c) => c.label);
    const rows = orderList.map((order) => {
      return columns.map((c) => {
        if (c.path === "__static.exportedTimestamp") return new Date().toISOString();
        const rawValue = getByPath(order, c.path);
        return normalizeCellValue(rawValue);
      });
    });

    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((r) => r.map(csvEscape).join(",")),
    ];

    return lines.join("\r\n");
  };

  const downloadCSV = () => {
    if (typeof document === "undefined") return;

    const csv = buildCSV();
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const templateName = (storeName.value || "order-export-template").trim() || "order-export-template";
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `${templateName}-${datePart}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={{height: '1000px'}}>
      <ModalField
        query={query}
        selectedPaths={draftSelectedPaths}
        availableFields={availableFields}
        onSearchChange={setQuery}
        onChangeSelected={setDraftSelectedPaths}
        onSave={handleSaveFields}
        onCancel={handleCancelFields}
      />

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
                  <s-button commandFor="add-field-modal" onClick={openAddFieldModal}>
                    Add field
                  </s-button>

                  <s-button variant="primary" onClick={downloadCSV}>
                    Download CSV
                  </s-button>
                </s-stack>
              </s-box>

              <DndContext
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="order-table-wrapper">
                  <table className="order-table">
                    <thead>
                      <tr>
                        <th className="th-field">Field</th>

                        {orderList.map((_, i) => (
                          <th key={i} className="th-row">
                            Row {i + 1}
                          </th>
                        ))}

                        <th className="th-action">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      <SortableContext
                        items={columns.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {columns.map((col) => (
                          <SortableFieldRow
                            key={col.id}
                            column={col}
                            orders={orderList}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  </table>
                </div>

                <DragOverlay>
                  {activeColumn ? (
                    <div className="drag-overlay">
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
