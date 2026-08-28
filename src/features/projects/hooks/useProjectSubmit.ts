import { useWallet } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import { normalizeProjectInput, validateProjectInput, type ProjectInput } from '@/shared/projects';
import { useRegisterProject, useUpdateProject } from '@/features/projects/api/projects.queries';
import { signProjectUpdate } from '@/features/projects/utils/signProjectUpdate';

/** Normalize → validate → sign with the connected wallet → POST/PUT. Throws on any failure. */
export function useProjectSubmit() {
  const { wallet, connected } = useWallet();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const register = useRegisterProject();
  const update = useUpdateProject();

  const submit = async (input: ProjectInput, id?: string): Promise<{ id: string }> => {
    if (!wallet || !connected || !stakeAddress) throw new Error('Connect a wallet first');
    const project = normalizeProjectInput(input);
    const problem = validateProjectInput(project);
    if (problem) throw new Error(problem);
    if (id) {
      const signed = await signProjectUpdate(wallet, stakeAddress, project, { action: 'update', projectId: id });
      return update.mutateAsync({ id, ...signed });
    }
    const signed = await signProjectUpdate(wallet, stakeAddress, project, { action: 'create' });
    return register.mutateAsync(signed);
  };

  return { submit, isPending: register.isPending || update.isPending };
}
