import { useCallback, useMemo, useState } from 'react'
import { useEvmTransfer } from './useEvmTransfer'
import { useSolanaTransfer } from './useSolanaTransfer'
import { assetMap } from '../lib/constants'
import type { AssetKey } from '../lib/types'
import { getEvmExplorerLink, getSolanaExplorerLink } from '../lib/utils'

export function useTransferPageController() {
  const [asset, setAsset] = useState<AssetKey>('eth')
  const evm = useEvmTransfer()
  const solana = useSolanaTransfer()

  const currentAsset = assetMap[asset]
  const currentPending = asset === 'eth' ? evm.pending : solana.pending
  const currentConnectedAccount = asset === 'eth' ? evm.account : solana.address
  const currentBalance = asset === 'eth' ? evm.balance : solana.balance
  const currentStatus = asset === 'eth' ? evm.status : solana.status
  const currentLink = asset === 'eth' ? evm.txHash : solana.signature
  const currentForm = asset === 'eth' ? evm.form : solana.form

  const amountNumber = Number(currentForm.amount)
  const isValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const fiatRate = asset === 'eth' ? 2472 : 132.48
  const fiatValue = isValidAmount ? amountNumber * fiatRate : 0
  const gasFee = asset === 'eth' ? 0.0012 : 0.00018
  const gasFeeFiat = gasFee * fiatRate
  const willOverflow = isValidAmount && amountNumber > currentBalance
  const canSubmit =
    currentConnectedAccount !== null &&
    currentForm.to.trim().length > 0 &&
    isValidAmount &&
    !willOverflow

  const statusText = useMemo(() => {
    if (!currentConnectedAccount) {
      return 'Connect wallet first'
    }

    if (!currentForm.amount) {
      return 'Ready to transfer'
    }

    if (willOverflow) {
      return 'Insufficient balance'
    }

    if (isValidAmount) {
      return 'Transfer details ready'
    }

    return 'Enter a valid amount'
  }, [currentConnectedAccount, currentForm.amount, isValidAmount, willOverflow])

  const txLink = useMemo(() => {
    if (!currentLink) {
      return null
    }

    return asset === 'eth' ? getEvmExplorerLink(currentLink) : getSolanaExplorerLink(currentLink)
  }, [asset, currentLink])

  const patchRecipient = useCallback(
    (value: string) => {
      if (asset === 'eth') {
        evm.patchForm({ to: value })
        return
      }

      solana.patchForm({ to: value })
    },
    [asset, evm, solana],
  )

  const patchAmount = useCallback(
    (value: string) => {
      if (asset === 'eth') {
        evm.patchForm({ amount: value })
        return
      }

      solana.patchForm({ amount: value })
    },
    [asset, evm, solana],
  )

  const handlePasteRecipient = useCallback(() => {
    navigator.clipboard
      ?.readText()
      .then((text) => {
        if (!text) {
          return
        }

        patchRecipient(text)
      })
      .catch(() => undefined)
  }, [patchRecipient])

  const handleSetMax = useCallback(() => {
    const nextAmount = currentBalance > 0 ? currentBalance.toFixed(asset === 'eth' ? 4 : 3) : ''
    patchAmount(nextAmount)
  }, [asset, currentBalance, patchAmount])

  const handleRefresh = useCallback(() => {
    if (asset === 'eth') {
      void evm.syncWalletState()
      return
    }

    void solana.syncWalletState()
  }, [asset, evm, solana])

  const handleConnect = useCallback(() => {
    if (asset === 'eth') {
      void evm.connectWallet()
      return
    }

    void solana.connectWallet()
  }, [asset, evm, solana])

  const handleSubmit = useCallback(() => {
    if (asset === 'eth') {
      void evm.sendTransfer()
      return
    }

    void solana.sendTransfer()
  }, [asset, evm, solana])

  return {
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
  }
}
