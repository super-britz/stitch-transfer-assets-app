import type { LucideIcon } from 'lucide-react'

export type AssetKey = 'eth' | 'sol'
export type StatusTone = 'neutral' | 'success' | 'warning' | 'error'
export type EvmWalletKind = 'metamask' | 'rabby' | 'okx' | 'generic'

export type StatusState = {
  tone: StatusTone
  text: string
}

export type TransferForm = {
  to: string
  amount: string
}

export type AssetConfig = {
  icon: LucideIcon
  label: string
  network: string
  recipientHint: string
  symbol: string
  tone: string
}

export type EvmWalletOption = {
  kind: EvmWalletKind
  label: string
}
