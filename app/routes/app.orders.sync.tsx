import { fetchShopifyOrders, upsertOrdersForShop } from "app/services/orders.server";
import { authenticate } from "app/shopify.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";

// Helper: chuẩn hoá error để trả về client (tránh lộ stacktrace)
function serializeThrown(error: unknown) {
  if (error instanceof Response) {
    return {
      message: `${error.status} ${error.statusText}`.trim(),
    };
  }

  const e: any = error;
  return {
    message: e?.message ?? String(error),
  };
}

// Loader chỉ dùng để check auth khi user mở trang/endpoint
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return data({ ok: true });
};

// Action: sync orders từ Shopify về DB (Mongo qua Prisma)
export const action = async ({ request }: ActionFunctionArgs) => {
  // Lấy admin context + session.shop
  const { admin, session } = await authenticate.admin(request);

  try {
    // Bước 1: query danh sách orders cơ bản (orders connection)
    const orders = await fetchShopifyOrders(admin, 50);

    // Bước 2: upsert vào DB theo shop
    // - Nếu có legacyResourceId, sẽ fetch thêm "raw" chi tiết cho từng order
    // - Lưu raw vào cột Order.raw để phục vụ export theo JSON-path
    const result = await upsertOrdersForShop(session.shop, orders, admin);

    return data({ ok: true, ...result });
  } catch (error: unknown) {
    console.error("order sync failed", error);

    const { message } = serializeThrown(error);
    return data({ ok: false, error: message }, { status: 500 });
  }
};
