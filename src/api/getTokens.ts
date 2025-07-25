import { getTokens as getTokensFromVMSDK, setApiToken } from 'vm-sdk'

const MY_API_KEY = import.meta.env.VITE_VM_API_KEY

if (!MY_API_KEY) {
  throw new Error('VITE_VM_API_KEY is not set in .env file or environment variables')
}
setApiToken(MY_API_KEY as string)

export const getTokens = async () => {
  const tokens = await getTokensFromVMSDK()
  console.log('tokens',tokens)
  return tokens
}
