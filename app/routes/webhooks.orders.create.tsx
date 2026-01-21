import prisma from "app/db.server";
import { authenticate } from "app/shopify.server";
import type { ActionFunctionArgs } from "react-router";

type OrdersCreateWebhookPayload = {
  admin_graphql_api_id?: string;
  name?: string;
  order_number?: number;
  created_at?: string;
  processed_at?: string | null;
  currency?: string;
  total_price?: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const p = payload as unknown as OrdersCreateWebhookPayload;
  const adminGid = p.admin_graphql_api_id;

  if (!adminGid) {
    console.warn("orders/create webhook missing admin_graphql_api_id", { shop });
    return new Response(null, { status: 204 });
  }

  const totalPrice = p.total_price != null ? Number(p.total_price) : null;

  await prisma.order.upsert({
    where: { adminGid },
    create: {
      shop,
      adminGid,
      name: p.name ?? null,
      orderNumber: p.order_number ?? null,
      createdAt: p.created_at ? new Date(p.created_at) : new Date(),
      processedAt: p.processed_at ? new Date(p.processed_at) : null,
      currencyCode: p.currency ?? null,
      totalPrice: Number.isFinite(totalPrice as any) ? (totalPrice as any) : null,
      financialStatus: p.financial_status ?? null,
      fulfillmentStatus: p.fulfillment_status ?? null,
      raw: payload as any,
    },
    update: {
      shop,
      name: p.name ?? null,
      orderNumber: p.order_number ?? null,
      createdAt: p.created_at ? new Date(p.created_at) : new Date(),
      processedAt: p.processed_at ? new Date(p.processed_at) : null,
      currencyCode: p.currency ?? null,
      totalPrice: Number.isFinite(totalPrice as any) ? (totalPrice as any) : null,
      financialStatus: p.financial_status ?? null,
      fulfillmentStatus: p.fulfillment_status ?? null,
      raw: payload as any,
    },
  });

  return new Response(null, { status: 200 });
};

