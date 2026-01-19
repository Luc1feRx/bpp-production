import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "app/db.server";

type ShopifyProductNode = {
  id: string;
  title?: string | null;
  handle?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export async function fetchShopifyProducts(admin: AdminApiContext, first = 50) {
  const response = await admin.graphql(
    `#graphql
      query ProductsForSync($first: Int!) {
        products(first: $first, sortKey: UPDATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              status
              createdAt
              updatedAt
            }
          }
        }
      }
    `,
    { variables: { first } },
  );

  const json = await response.json();
  const edges = json?.data?.products?.edges ?? [];

  return edges
    .map((e: any) => e?.node as ShopifyProductNode)
    .filter((n: ShopifyProductNode | undefined) => Boolean(n?.id));
}

export async function upsertProductsForShop(shop: string, products: ShopifyProductNode[]) {
  const ops = products.map((p) =>
    prisma.product.upsert({
      where: { adminGid: p.id },
      create: {
        shop,
        adminGid: p.id,
        title: p.title ?? null,
        handle: p.handle ?? null,
        status: p.status ?? null,
        createdAt: p.createdAt ? new Date(p.createdAt) : null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
        raw: p as any,
      },
      update: {
        shop,
        title: p.title ?? null,
        handle: p.handle ?? null,
        status: p.status ?? null,
        createdAt: p.createdAt ? new Date(p.createdAt) : null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
        raw: p as any,
      },
    }),
  );

  await prisma.$transaction(ops);
  return { count: ops.length };
}

