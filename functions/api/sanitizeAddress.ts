interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const walletAddress = url.searchParams.get("address");

  console.log("sanitizeAddress called with address:", walletAddress);

  if (!walletAddress) {
    return new Response(
      JSON.stringify({ error: "address is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { getSanitizedAddress, setApiToken } = await import('vm-sdk');
    setApiToken(env.VITE_VM_API_KEY);

    const response = await getSanitizedAddress(walletAddress);

    return new Response(
      JSON.stringify({ address: response.address }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: `Failed to sanitize address: ${error instanceof Error ? error.message : 'Unknown error'}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};