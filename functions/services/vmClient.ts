interface Env {
  VITE_VM_API_KEY: string;
}

export async function initVmSdk(env: Env) {
  const { setApiToken } = await import('vm-sdk');
  setApiToken(env.VITE_VM_API_KEY);
}

export function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

export function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders() });
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
