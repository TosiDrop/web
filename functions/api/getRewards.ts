interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const stakeAddress = url.searchParams.get("walletId");

  console.log("getRewards called with stakeAddress:", stakeAddress);

  if (!stakeAddress) {
    return new Response(
      JSON.stringify({ error: "stakeAddress is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { getRewards, setApiToken } = await import('vm-sdk');
    setApiToken(env.VITE_VM_API_KEY);

    const rewards = await getRewards(stakeAddress);

    return new Response(
      JSON.stringify({ rewards }),
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
      JSON.stringify({ error: `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};