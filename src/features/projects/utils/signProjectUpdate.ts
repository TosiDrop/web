import { DEPLOYMENT_NETWORK } from '@/config/network';
import {
  buildProjectMessage,
  projectDigest,
  type ProjectAction,
  type ProjectInput,
} from '@/shared/projects';
import type { SignedProjectRequest } from '@/features/projects/api/projects.queries';

interface MinimalWallet {
  signData(address: string, payload: string): Promise<{ signature: string; key: string }>;
}

function toHex(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * CIP-30 datasignature binding `project` to the owner's stake address, the
 * operation, the target project and this deployment's network.
 */
export async function signProjectUpdate(
  wallet: MinimalWallet,
  stakeAddress: string,
  project: ProjectInput,
  target: { action: 'create' } | { action: 'update'; projectId: string },
): Promise<SignedProjectRequest> {
  const message = buildProjectMessage({
    action: target.action as ProjectAction,
    network: DEPLOYMENT_NETWORK,
    stakeAddress,
    projectId: target.action === 'update' ? target.projectId : null,
    digest: await projectDigest(project),
  });
  const { signature, key } = await wallet.signData(stakeAddress, toHex(message));
  return { ownerAddress: stakeAddress, project, signature, key, message };
}
