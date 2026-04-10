import { sepoliaExplorerBaseUrl } from './constants'
import type { StatusState, StatusTone } from './types'

export function createStatus(tone: StatusTone, text: string): StatusState {
  return { tone, text }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatAmount(value: number, symbol: string, digits = 3) {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)} ${symbol}`
}

export function shortenAddress(address: string | null) {
  if (!address) {
    return 'Not connected'
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getEvmExplorerLink(hash: string) {
  return `${sepoliaExplorerBaseUrl}/tx/${hash}`
}

export function getSolanaExplorerLink(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

export function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return fallback
}
