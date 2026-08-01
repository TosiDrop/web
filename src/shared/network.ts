export type Network = 'mainnet' | 'preview';

export function normalizeDeploymentNetwork(value: unknown): Network {
  return value === 'mainnet' ? 'mainnet' : 'preview';
}

export function networkFromId(networkId: number | null): Network | null {
  if (networkId === 1) return 'mainnet';
  if (networkId === 0) return 'preview';
  return null;
}

export function networkLabel(network: Network): string {
  return network === 'mainnet' ? 'Mainnet' : 'Preview';
}
