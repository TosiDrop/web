interface Env {
  VITE_VM_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const stakeAddress = url.searchParams.get("walletId");

  console.log("getRewards called with stakeAddress:", stakeAddress);
  console.log("API Key exists:", !!env.VITE_VM_API_KEY);
  console.log("API Key length:", env.VITE_VM_API_KEY?.length);

  if (!stakeAddress) {
    return new Response(
      JSON.stringify({ error: "stakeAddress is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!env.VITE_VM_API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key not available in environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { getRewards, setApiToken } = await import('vm-sdk');
    setApiToken(env.VITE_VM_API_KEY);

    console.log("About to call getRewards with stakeAddress:", stakeAddress);
    const rewards = await getRewards(stakeAddress);
    console.log("getRewards completed successfully");

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
    console.error("Full error object:", error);
    console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        error: `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fullError: error instanceof Error ? error.stack : 'No stack trace'
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};