export type ColumnFieldOrder = {
  id: string;
  label: string;
  path: string;
};


export type OrderField = {
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