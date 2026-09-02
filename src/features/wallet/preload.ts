/** One import site for the lazy wallet chunk, so a prefetch on intent shares it with the runtime. */
export const preloadWalletRuntime = () => import('./WalletRuntime');
