/**
 * The UTXOS wallet is not enabled by this application. Keep Mesh's optional
 * UTXOS integration out of the browser bundle so its Bitcoin WASM module does
 * not abort during application startup.
 */
export const Web3Wallet = {
  enable: async () => {
    throw new Error('The UTXOS wallet is not available in this application.');
  },
};
