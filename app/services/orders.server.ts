
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "app/db.server";

// Đây là shape tối thiểu mình lấy từ query orders connection.
// Mục tiêu: đủ thông tin để upsert các cột quan trọng + có legacyResourceId để fetch raw chi tiết.
type ShopifyOrderNode = {
  id: string;
  name?: string | null;
  orderNumber?: number | null;
  createdAt: string;
  processedAt?: string | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  totalPriceSet?: {
    shopMoney?: {
      amount?: string | null;
      currencyCode?: string | null;
    } | null;
  } | null;
  // legacyResourceId là numeric ID (kiểu REST cũ). Dùng để build GID và query order raw chi tiết.
  legacyResourceId?: string | number | null;
};

// Fetch danh sách orders mới nhất để sync nhanh.
// Lưu ý: query này chỉ lấy fields "summary" (nhẹ) để giảm cost.
export async function fetchShopifyOrders(admin: AdminApiContext, first = 50) {
  const response = await admin.graphql(
    `#graphql
      query OrdersForSync($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              legacyResourceId
              name
              orderNumber
              createdAt
              processedAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
    { variables: { first } },
  );

  const json = await response.json();
  const edges = json?.data?.orders?.edges ?? [];

  return edges
    .map((e: any) => e?.node as ShopifyOrderNode)
    .filter((n: ShopifyOrderNode | undefined) => Boolean(n?.id));
}

// Fetch order "raw" chi tiết hơn cho mục đích export.
// raw này sẽ được lưu vào cột Order.raw trong DB.
//
// Vì query orders connection không trả "tất cả field" (và query quá nặng),
// mình dùng thêm 1 query order(id) để lấy sâu hơn (customer, address, line items...).
export async function fetchOrderRawByLegacyId(admin: AdminApiContext, legacyId: string) {
  const response = await admin.graphql(
    `#graphql
      query OrderRawForExport($id: ID!) {
        order(id: $id) {
          id
          legacyResourceId
          name
          email
          phone
          createdAt
          processedAt
          cancelledAt
          cancelReason
          closedAt
          confirmed
          currencyCode
          presentmentCurrencyCode
          displayFinancialStatus
          displayFulfillmentStatus
          tags
          note
          customer {
            id
            email
            firstName
            lastName
            phone
          }
          shippingAddress {
            name
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          billingAddress {
            name
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
            presentmentMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
            presentmentMoney {
              amount
              currencyCode
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
              currencyCode
            }
            presentmentMoney {
              amount
              currencyCode
            }
          }
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
            presentmentMoney {
              amount
              currencyCode
            }
          }
          lineItems(first: 250) {
            edges {
              node {
                id
                name
                title
                sku
                quantity
                vendor
                taxable
                requiresShipping
                fulfillmentStatus
                variant {
                  id
                  title
                  sku
                }
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
                discountedTotalSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                  presentmentMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    `,
    // Build lại GID từ legacy id (numeric) để query order(id)
    { variables: { id: `gid://shopify/Order/${legacyId}` } },
  );

  const json = await response.json();
  return json?.data?.order ?? null;
}

// Upsert orders vào DB theo shop.
// - Luôn cập nhật các cột quan trọng (name, createdAt, totalPrice...) để query nhanh.
// - Đồng thời lưu "raw" để export theo JSON-path (A+B).
export async function upsertOrdersForShop(
  shop: string,
  orders: ShopifyOrderNode[],
  admin?: AdminApiContext,
) {
  // Dùng Promise.all vì mỗi order có thể cần fetch raw chi tiết (I/O bound)
  const ops = orders.map(async (o) => {
    const amountStr = o.totalPriceSet?.shopMoney?.amount ?? null;
    const totalPrice = amountStr != null ? Number(amountStr) : null;

    // Mặc định raw = node summary
    let raw: any = o as any;

    // Nếu có legacyResourceId thì fetch raw chi tiết hơn
    const legacyId = o.legacyResourceId != null ? String(o.legacyResourceId) : null;
    if (admin && legacyId) {
      try {
        const full = await fetchOrderRawByLegacyId(admin, legacyId);
        if (full) raw = full;
      } catch (e) {
        // Không cho fail cả sync chỉ vì 1 order fetch raw lỗi
        console.warn("fetchOrderRawByLegacyId failed", {
          shop,
          legacyId,
          error: (e as any)?.message ?? String(e),
        });
      }
    }

    return prisma.order.upsert({
      where: { adminGid: o.id },
      create: {
        shop,
        adminGid: o.id,
        name: o.name ?? null,
        orderNumber: o.orderNumber ?? null,
        createdAt: new Date(o.createdAt),
        processedAt: o.processedAt ? new Date(o.processedAt) : null,
        currencyCode: o.totalPriceSet?.shopMoney?.currencyCode ?? null,
        totalPrice: totalPrice as any,
        financialStatus: o.displayFinancialStatus ?? null,
        fulfillmentStatus: o.displayFulfillmentStatus ?? null,
        raw: raw as any,
      },
      update: {
        shop,
        name: o.name ?? null,
        orderNumber: o.orderNumber ?? null,
        createdAt: new Date(o.createdAt),
        processedAt: o.processedAt ? new Date(o.processedAt) : null,
        currencyCode: o.totalPriceSet?.shopMoney?.currencyCode ?? null,
        totalPrice: totalPrice as any,
        financialStatus: o.displayFinancialStatus ?? null,
        fulfillmentStatus: o.displayFulfillmentStatus ?? null,
        raw: raw as any,
      },
    });
  });

  const results = await Promise.all(ops);

  return { count: results.length };
}
