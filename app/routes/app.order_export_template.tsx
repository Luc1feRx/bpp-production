import OrderExportTemplate from "app/components/OrderExportTemplate";
import prisma from "app/db.server";
import { authenticate } from "app/shopify.server";
import type { LoaderFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";

type LoaderOrder = {
  id: string;
  adminGid: string;
  name: string | null;
  createdAt: string;
  processedAt: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: number | null;
  currencyCode: string | null;
  raw: any;
};

// Loader server-side:
// - Xác thực shop đang đăng nhập
// - Lấy danh sách orders đã lưu trong Mongo (qua Prisma)
// - Trả về cho client để render table + đọc fields từ raw
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Shopify admin auth để lấy session.shop
  const { session } = await authenticate.admin(request);

  // Lấy orders theo shop, order mới nhất trước
  // raw: chứa full payload (để user có thể export theo JSON-path)
  const orders = await prisma.order.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      order_id: true,
      adminGid: true,
      name: true,
      createdAt: true,
      processedAt: true,
      financialStatus: true,
      fulfillmentStatus: true,
      totalPrice: true,
      currencyCode: true,
      raw: true,
    },
  });

  // Prisma DateTime -> string để client nhận được (tránh serialize lỗi)
  const serialized: LoaderOrder[] = orders.map((o) => ({
    id: o.order_id,
    adminGid: o.adminGid,
    name: o.name ?? null,
    createdAt: o.createdAt.toISOString(),
    processedAt: o.processedAt ? o.processedAt.toISOString() : null,
    financialStatus: o.financialStatus ?? null,
    fulfillmentStatus: o.fulfillmentStatus ?? null,
    totalPrice: o.totalPrice ?? null,
    currencyCode: o.currencyCode ?? null,
    raw: o.raw as any,
  }));

  return data({ orders: serialized });
};

export default function OrderExportTemplatePage() {
  // Orders được load từ loader ở trên
  const { orders } = useLoaderData() as { orders: LoaderOrder[] };

  return (
    <s-page heading="Order Export Template page">
      <OrderExportTemplate orders={orders} />
    </s-page>
  );
}
