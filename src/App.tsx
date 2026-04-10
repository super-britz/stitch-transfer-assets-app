import { ArrowLeft, CircleHelp } from 'lucide-react'
import { HomeworkOverview } from './components/transfer/HomeworkOverview'
import { TransferFooter } from './components/transfer/TransferFooter'
import { TransferFormPanel } from './components/transfer/TransferFormPanel'
import { WalletOverviewPanel } from './components/transfer/WalletOverviewPanel'
import { useTransferPageController } from './hooks/useTransferPageController'

function App() {
  const {
    asset,
    setAsset,
    evm,
    solana,
    currentAsset,
    currentPending,
    currentConnectedAccount,
    currentBalance,
    currentStatus,
    currentForm,
    fiatRate,
    fiatValue,
    gasFee,
    gasFeeFiat,
    willOverflow,
    canSubmit,
    statusText,
    txLink,
    patchRecipient,
    patchAmount,
    handlePasteRecipient,
    handleSetMax,
    handleRefresh,
    handleConnect,
    handleSubmit,
  } = useTransferPageController()

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-on-surface sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <HomeworkOverview />

          <main className="mx-auto flex w-full max-w-[23rem] flex-col overflow-hidden rounded-[2rem] border border-white/6 bg-[#131313] shadow-device">
            <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full bg-surface-container-low text-primary transition hover:bg-surface-container-high"
                  aria-label="Go back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-on-surface-variant">
                    Wallet
                  </p>
                  <h2 className="font-headline text-base font-bold text-white">Transfer Assets</h2>
                </div>
              </div>

              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container-low hover:text-white"
                aria-label="More information"
              >
                <CircleHelp size={18} />
              </button>
            </header>

            <div className="flex-1 px-5 pb-8 pt-5">
              <WalletOverviewPanel
                asset={asset}
                onSelectAsset={setAsset}
                currentAsset={currentAsset}
                currentBalance={currentBalance}
                fiatRate={fiatRate}
                currentConnectedAccount={currentConnectedAccount}
                currentPending={currentPending}
                currentStatus={currentStatus}
                txLink={txLink}
                onRefresh={handleRefresh}
                onConnect={handleConnect}
                evmChainId={evm.chainId}
                evmWalletLabel={evm.walletLabel}
                solanaWalletName={solana.walletName}
                evmWalletOptions={evm.walletOptions}
                evmWalletKind={evm.walletKind}
                onPickEvmWallet={evm.setWalletKind}
              />

              <TransferFormPanel
                currentAsset={currentAsset}
                recipient={currentForm.to}
                amount={currentForm.amount}
                fiatValue={fiatValue}
                gasFee={gasFee}
                gasFeeFiat={gasFeeFiat}
                onChangeRecipient={patchRecipient}
                onPasteRecipient={handlePasteRecipient}
                onChangeAmount={patchAmount}
                onSetMax={handleSetMax}
              />
            </div>

            <TransferFooter
              currentConnectedAccount={currentConnectedAccount}
              willOverflow={willOverflow}
              canSubmit={canSubmit}
              statusText={statusText}
              recipient={currentForm.to}
              amount={currentForm.amount}
              currentAsset={currentAsset}
              currentPending={currentPending}
              onSubmit={handleSubmit}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
