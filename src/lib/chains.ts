import { createSolanaRpc, devnet } from '@solana/kit'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

export const solanaRpc = createSolanaRpc(devnet('https://api.devnet.solana.com'))

export const LAMPORTS_PER_SOL = 1_000_000_000
export const sepoliaChainId = '0xaa36a7'
