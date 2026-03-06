interface SignProfilePayload {
  wallet: { signData: (address: string, payload: string) => Promise<{ signature: string; key: string }> };
  address: string;
  displayAddress: string;
  name: string;
}

export async function signProfileUpdateMessage({
  wallet,
  address,
  displayAddress,
  name,
}: SignProfilePayload) {
  const messageToSign = `Update profile for ${displayAddress} with name: ${name}`;
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(messageToSign);
  const hexMessage = Array.from(messageBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const result = await wallet.signData(address, hexMessage);
  return {
    signature: result.signature,
    key: result.key,
    message: messageToSign,
  };
}
