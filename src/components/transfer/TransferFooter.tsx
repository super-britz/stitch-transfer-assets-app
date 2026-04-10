import type { AssetConfig } from '../../lib/types'
import { navItems } from '../../lib/constants'

type TransferFooterProps = {
  currentConnectedAccount: string | null
  willOverflow: boolean
  canSubmit: boolean
  statusText: string
  recipient: string
  amount: string
  currentAsset: AssetConfig
  currentPending: boolean
  onSubmit: () => void
}

export function TransferFooter(props: TransferFooterProps) {
  const {
    currentConnectedAccount,
    willOverflow,
    canSubmit,
    statusText,
    recipient,
    amount,
    currentAsset,
    currentPending,
    onSubmit,
  } = props

  return (
    <footer className="bg-gradient-to-t from-[#131313] via-[#131313]/96 to-transparent px-5 pb-8 pt-3">
      <div className="mb-4 rounded-3xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-on-surface-variant">Transfer summary</span>
          <span
            className={`font-semibold ${
              !currentConnectedAccount
                ? 'text-primary'
                : willOverflow
                  ? 'text-[#FF6E84]'
                  : canSubmit
                    ? 'text-[#B4FDB4]'
                    : 'text-primary'
            }`}
          >
            {statusText}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[0.72rem] text-on-surface-variant">
          <span>{recipient ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : 'No recipient yet'}</span>
          <span>{amount ? `${amount} ${currentAsset.symbol}` : '0.00'}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || currentPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#94aaff_0%,#3768fa_100%)] px-4 py-4 font-headline text-lg font-extrabold text-[#0C1233] shadow-[0_24px_48px_-26px_rgba(61,109,255,0.75)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {currentPending ? 'Submitting...' : 'Send Assets'}
      </button>

      <nav className="mt-4 flex items-center justify-around rounded-2xl bg-[#111111] px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              type="button"
              className={`grid size-12 place-items-center rounded-xl transition ${
                item.active
                  ? 'bg-surface-container-highest text-primary shadow-[0_16px_28px_-24px_rgba(148,170,255,0.85)]'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-white'
              }`}
              aria-label={item.label}
            >
              <Icon size={18} />
            </button>
          )
        })}
      </nav>
    </footer>
  )
}
