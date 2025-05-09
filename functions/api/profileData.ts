/// <reference types="@cloudflare/workers-types" />

interface Env {
  VM_WEB_PROFILES: KVNamespace;
}

interface WalletPostRequest {
  walletId: string;
  value: string;
}

// Handles GET requests: /api/profileData?walletId=SOME_WALLET_ID
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const walletId = url.searchParams.get("walletId");

  if (!walletId) {
    return new Response("walletId is required", { status: 400 });
  }

  try {
    const value = await env.VM_WEB_PROFILES.get(walletId);

    if (value === null) {
      return new Response(`No value found for walletId: ${walletId}`, { status: 404 });
    }
    return new Response(value, { headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    console.error("KV GET Error:", error);
    return new Response("Error fetching data from KV", { status: 500 });
  }
};

// Handles POST requests: /api/profileData
// Body: { "walletId": "walletId ", value": "test any string for now" }
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.headers.get("Content-Type") !== "application/json") {
    return new Response("Request body must be JSON", { status: 415 });
  }

  try {
    const body = await request.json<WalletPostRequest>();
    const { walletId, value } = body;

    if (!walletId || typeof value !== 'string') {
      return new Response("Missing walletId or value (must be a string) in request body", { status: 400 });
    }

    await env.VM_WEB_PROFILES.put(walletId, value);
    return new Response(`Stored value for walletId: ${walletId}`, { status: 200 });

  } catch (error) {
    if (error instanceof SyntaxError) {
        return new Response("Invalid JSON in request body", { status: 400 });
    }
    console.error("KV PUT Error:", error);
    return new Response("Error storing data to KV", { status: 500 });
  }
};
