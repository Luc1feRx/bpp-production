
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "app/db.server";

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
};

export async function fetchShopifyOrders(admin: AdminApiContext, first = 50) {
  const response = await admin.graphql(
    `#graphql
      query OrdersForSync($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
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

export async function upsertOrdersForShop(shop: string, orders: ShopifyOrderNode[]) {
  const ops = orders.map((o) => {
    const amountStr = o.totalPriceSet?.shopMoney?.amount ?? null;
    const totalPrice = amountStr != null ? Number(amountStr) : null;

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
        raw: o as any,
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
        raw: o as any,
      },
    });
  });

  await prisma.$transaction(ops);
  return { count: ops.length };
}

