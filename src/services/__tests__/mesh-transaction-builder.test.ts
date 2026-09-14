import { describe, expect, it, vi } from 'vitest';
import { adaptMeshWalletInitiator, type MeshWalletInitiator } from '../mesh-transaction-builder';

describe('adaptMeshWalletInitiator', () => {
  it('uses Mesh-shaped wallet methods when the React wrapper provides them', async () => {
    const meshUtxos = [{ input: { txHash: 'tx', outputIndex: 0 }, output: { address: 'addr', amount: [] } }];
    const wallet = {
      getChangeAddress: vi.fn(async () => 'hex-change-address'),
      getChangeAddressBech32: vi.fn(async () => 'addr-change-address'),
      getUtxos: vi.fn(async () => ['cbor-utxo']),
      getUtxosMesh: vi.fn(async () => meshUtxos),
      getCollateral: vi.fn(async () => ['cbor-collateral']),
      getCollateralMesh: vi.fn(async () => meshUtxos),
    };

    const initiator = adaptMeshWalletInitiator(wallet as unknown as MeshWalletInitiator);

    await expect(initiator.getChangeAddress()).resolves.toBe('addr-change-address');
    await expect(initiator.getUtxos()).resolves.toBe(meshUtxos);
    await expect(initiator.getCollateral()).resolves.toBe(meshUtxos);
    expect(wallet.getChangeAddress).not.toHaveBeenCalled();
    expect(wallet.getUtxos).not.toHaveBeenCalled();
    expect(wallet.getCollateral).not.toHaveBeenCalled();
  });

  it('falls back to the legacy initiator methods', async () => {
    const wallet = {
      getChangeAddress: vi.fn(async () => 'change-address'),
      getUtxos: vi.fn(async () => []),
      getCollateral: vi.fn(async () => []),
    };

    const initiator = adaptMeshWalletInitiator(wallet);

    await initiator.getChangeAddress();
    await initiator.getUtxos();
    await initiator.getCollateral();
    expect(wallet.getChangeAddress).toHaveBeenCalledOnce();
    expect(wallet.getUtxos).toHaveBeenCalledOnce();
    expect(wallet.getCollateral).toHaveBeenCalledOnce();
  });
});
