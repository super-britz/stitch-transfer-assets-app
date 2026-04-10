import { AtSign, ScanLine, Shield } from 'lucide-react'
import type { AssetConfig } from '../../lib/types'
import { formatAmount, formatCurrency } from '../../lib/utils'

type TransferFormPanelProps = {
  currentAsset: AssetConfig
  recipient: string
  amount: string
  fiatValue: number
  gasFee: number
  gasFeeFiat: number
  onChangeRecipient: (value: string) => void
  onPasteRecipient: () => void
  onChangeAmount: (value: string) => void
  onSetMax: () => void
}

export function TransferFormPanel(props: TransferFormPanelProps) {
  const {
    currentAsset,
    recipient,
    amount,
    fiatValue,
    gasFee,
    gasFeeFiat,
    onChangeRecipient,
    onPasteRecipient,
    onChangeAmount,
    onSetMax,
  } = props

  return (
    <>
      <section className="mt-7 space-y-5">
        <label className="block">
          <span className="mb-2 block px-1 text-[0.7rem] font-medium text-on-surface-variant">Recipient Address</span>
          <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface-container-low px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/35">
            <AtSign size={18} className="text-on-surface-variant" />
            <input
              type="text"
              value={recipient}
              onChange={(event) => onChangeRecipient(event.target.value)}
              placeholder={currentAsset.recipientHint}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-outline"
            />
            <button
              type="button"
              onClick={onPasteRecipient}
              className="text-[0.7rem] font-bold text-primary transition hover:text-white"
            >
              Paste
            </button>
            <div className="h-4 w-px bg-outline-variant/25" />
            <button
              type="button"
              className="text-on-surface-variant transition hover:text-white"
              aria-label="Scan QR code"
            >
              <ScanLine size={18} />
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block px-1 text-[0.7rem] font-medium text-on-surface-variant">Amount to Send</span>
          <div className="rounded-2xl border border-white/5 bg-surface-container-low px-4 py-4 transition focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/35">
            <div className="flex items-start justify-between gap-4">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={amount}
                onChange={(event) => onChangeAmount(event.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent font-headline text-[2rem] font-bold tracking-[-0.05em] text-white outline-none placeholder:text-outline-variant"
              />

              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-bold text-white">{currentAsset.symbol}</span>
                <button
                  type="button"
                  onClick={onSetMax}
                  className="rounded-md bg-surface-container-highest px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-tight text-primary transition hover:text-white"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between text-[0.72rem] text-on-surface-variant">
              <span>{amount ? `≈ ${formatCurrency(fiatValue)} USD` : '≈ $0.00 USD'}</span>
              <span>Network: {currentAsset.network}</span>
            </div>
          </div>
        </label>

        <div className="rounded-[1.4rem] border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">Estimated Gas Fee</span>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{formatAmount(gasFee, currentAsset.symbol, 5)}</p>
              <p className="text-[0.65rem] text-on-surface-variant">{formatCurrency(gasFeeFiat)} USD</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">Estimated Arrival</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-[#B4FDB4]">
              <span className="inline-block size-2 rounded-full bg-[#92F3A6] shadow-[0_0_14px_rgba(146,243,166,0.8)]" />
              &lt; 30 seconds
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 flex gap-3 rounded-2xl border border-white/5 bg-surface-container-low px-4 py-4">
        <div className="mt-0.5 text-primary">
          <Shield size={18} />
        </div>
        <p className="text-[0.68rem] leading-5 text-on-surface-variant">
          Ensure the recipient address is on the <span className="font-medium text-white">{currentAsset.network}</span>. Transactions
          on the blockchain are irreversible and may result in permanent loss of funds if sent to the wrong address.
        </p>
      </div>
    </>
  )
}
