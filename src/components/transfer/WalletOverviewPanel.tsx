import { ExternalLink, RefreshCcw } from 'lucide-react'
import { sepoliaChainId } from '../../lib/chains'
import { assetMap } from '../../lib/constants'
import type { AssetConfig, AssetKey, EvmWalletOption, EvmWalletKind, StatusState } from '../../lib/types'
import { formatCurrency, shortenAddress } from '../../lib/utils'

type WalletOverviewPanelProps = {
  asset: AssetKey
  onSelectAsset: (asset: AssetKey) => void
  currentAsset: AssetConfig
  currentBalance: number
  fiatRate: number
  currentConnectedAccount: string | null
  currentPending: boolean
  currentStatus: StatusState
  txLink: string | null
  onRefresh: () => void
  onConnect: () => void
  evmChainId: string | null
  evmWalletLabel: string
  solanaWalletName: string
  evmWalletOptions: EvmWalletOption[]
  evmWalletKind: EvmWalletKind
  onPickEvmWallet: (kind: EvmWalletKind) => void
}

export function WalletOverviewPanel(props: WalletOverviewPanelProps) {
  const {
    asset,
    onSelectAsset,
    currentAsset,
    currentBalance,
    fiatRate,
    currentConnectedAccount,
    currentPending,
    currentStatus,
    txLink,
    onRefresh,
    onConnect,
    evmChainId,
    evmWalletLabel,
    solanaWalletName,
    evmWalletOptions,
    evmWalletKind,
    onPickEvmWallet,
  } = props

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-container-low p-1">
        {(Object.keys(assetMap) as AssetKey[]).map((key) => {
          const item = assetMap[key]
          const Icon = item.icon
          const isActive = key === asset

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectAsset(key)}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-surface-container-highest text-white shadow-[0_10px_25px_-18px_rgba(255,255,255,0.8)]'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-white'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </div>

      <section className="relative overflow-hidden rounded-[1.65rem] bg-surface-container p-6 text-center">
        <div className="absolute -right-8 -top-10 size-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-on-surface-variant">Available balance</p>
        <div className="mt-3 flex items-end justify-center gap-2">
          <span className="font-headline text-[2.6rem] font-extrabold leading-none tracking-[-0.06em] text-white">
            {currentBalance.toFixed(3)}
          </span>
          <span
            className={`bg-gradient-to-r ${currentAsset.tone} bg-clip-text font-headline text-[2.25rem] font-extrabold leading-none tracking-[-0.06em] text-transparent`}
          >
            {currentAsset.symbol}
          </span>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">{formatCurrency(currentBalance * fiatRate)} USD</p>
      </section>

      <div className="rounded-2xl border border-white/5 bg-surface-container-low p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.24em] text-on-surface-variant">Connected account</p>
            <p className="mt-2 text-sm font-medium text-white">{shortenAddress(currentConnectedAccount)}</p>
            <p className="mt-1 text-[0.72rem] text-on-surface-variant">
              {asset === 'eth'
                ? evmChainId === sepoliaChainId
                  ? `${evmWalletLabel} • Sepolia ready`
                  : evmChainId
                    ? `${evmWalletLabel} • Wrong chain: ${evmChainId}`
                    : `${evmWalletLabel} • Waiting for wallet`
                : solanaWalletName}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={currentPending}
              className="grid size-10 place-items-center rounded-xl bg-surface-container-high text-on-surface-variant transition hover:text-white disabled:opacity-60"
              aria-label="Refresh wallet state"
            >
              <RefreshCcw size={16} />
            </button>

            <button
              type="button"
              onClick={onConnect}
              disabled={currentPending}
              className="rounded-xl bg-[linear-gradient(135deg,#94aaff_0%,#3768fa_100%)] px-3 py-2 text-xs font-bold text-[#0C1233] transition hover:brightness-110 disabled:opacity-60"
            >
              {currentPending ? 'Loading...' : currentConnectedAccount ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        </div>

        <div
          className={`mt-4 rounded-xl px-3 py-3 text-[0.72rem] leading-5 ${
            currentStatus.tone === 'success'
              ? 'bg-emerald-400/10 text-emerald-200'
              : currentStatus.tone === 'warning'
                ? 'bg-amber-400/10 text-amber-200'
                : currentStatus.tone === 'error'
                  ? 'bg-rose-400/10 text-rose-200'
                  : 'bg-white/[0.03] text-on-surface-variant'
          }`}
        >
          {currentStatus.text}
        </div>

        {txLink ? (
          <a
            href={txLink}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-white"
          >
            查看最近一笔交易
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>

      {asset === 'eth' && evmWalletOptions.length > 1 ? (
        <div className="rounded-2xl border border-white/5 bg-surface-container-low p-3">
          <p className="mb-3 text-[0.65rem] uppercase tracking-[0.24em] text-on-surface-variant">Active EVM wallet</p>
          <div className="flex flex-wrap gap-2">
            {evmWalletOptions.map((option) => (
              <button
                key={option.kind}
                type="button"
                onClick={() => onPickEvmWallet(option.kind)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  option.kind === evmWalletKind
                    ? 'bg-[linear-gradient(135deg,#94aaff_0%,#3768fa_100%)] text-[#0C1233]'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
