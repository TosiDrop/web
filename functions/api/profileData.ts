/// <reference types="@cloudflare/workers-types" />

interface Env {
  VM_WEB_PROFILES: KVNamespace;
}

interface WalletPostRequest {
  walletId: string;
  value: {
    name: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.headers.get("Content-Type") !== "application/json") {
    return new Response(
      JSON.stringify({ error: "Request body must be JSON" }),
      { status: 415, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: WalletPostRequest;
  try {
    body = await request.json<WalletPostRequest>();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { walletId, value } = body;
  if (!walletId) {
    return new Response(
      JSON.stringify({ error: "Missing walletId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    await env.VM_WEB_PROFILES.put(walletId, JSON.stringify(value));
    return new Response(
      JSON.stringify({ success: true, walletId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("KV PUT Error:", err);
    return new Response(
      JSON.stringify({ error: "Error storing data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const walletId = url.searchParams.get("walletId");

  if (!walletId) {
    return new Response(
      JSON.stringify({ error: "walletId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {

    const stored = await env.VM_WEB_PROFILES.get(walletId, { type: "json" });
    if (stored === null) {
      return new Response(
        JSON.stringify({ error: "Not found", walletId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ walletId, value: stored }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("KV GET Error:", err);
    return new Response(
      JSON.stringify({ error: "Error fetching data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
