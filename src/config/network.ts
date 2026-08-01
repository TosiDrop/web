import { normalizeDeploymentNetwork } from '@/shared/network';

export const DEPLOYMENT_NETWORK = normalizeDeploymentNetwork(import.meta.env.VITE_NETWORK);
