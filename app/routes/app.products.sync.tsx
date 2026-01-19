import { fetchShopifyProducts, upsertProductsForShop } from "app/services/products.server";
import { authenticate } from "app/shopify.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return data({ ok: true });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const products = await fetchShopifyProducts(admin, 50);
    const result = await upsertProductsForShop(session.shop, products);

    return data({ ok: true, ...result });
  } catch (error: unknown) {
    console.error("product sync failed", error);

    const { message } = serializeThrown(error);
    return data({ ok: false, error: message }, { status: 500 });
  }
};

