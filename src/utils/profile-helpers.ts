import { EnabledWallet } from '@newm.io/cardano-dapp-wallet-connector';

export const signProfileUpdateMessage = async (wallet: EnabledWallet, address: string, name: string) => {
  const messageToSign = `Update profile for ${address} with name: ${name}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(messageToSign);
  const hexMessage = Array.from(messageBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const result = await wallet.signData(address, hexMessage);
  return {
    signature: result.signature,
    message: messageToSign
  };
};

export const saveProfileData = async (address: string, name: string, signature: string, signedMessage: string) => {
  const response = await fetch('/api/profileData', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletId: address,
      value: { name },
      signature,
      message: signedMessage
    }),
  });

  return await response.json() as { error?: string, success?: boolean };
};