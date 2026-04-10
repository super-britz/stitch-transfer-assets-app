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

  const evmPatchForm = evm.patchForm
  const evmSyncWalletState = evm.syncWalletState
  const evmConnectWallet = evm.connectWallet
  const evmSendTransfer = evm.sendTransfer
  const solanaPatchForm = solana.patchForm
  const solanaSyncWalletState = solana.syncWalletState
  const solanaConnectWallet = solana.connectWallet
  const solanaSendTransfer = solana.sendTransfer

  // 1) 根据当前资产选择活跃链路数据，供页面组件统一消费。
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

  // 2) 汇总底部状态文案，避免 UI 组件里散落条件判断。
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

  // 3) 对外暴露的交互动作：先按资产分发，再调用对应链路 Hook。
  const patchRecipient = useCallback(
    (value: string) => {
      if (asset === 'eth') {
        evmPatchForm({ to: value })
        return
      }

      solanaPatchForm({ to: value })
    },
    [asset, evmPatchForm, solanaPatchForm],
  )

  const patchAmount = useCallback(
    (value: string) => {
      if (asset === 'eth') {
        evmPatchForm({ amount: value })
        return
      }

      solanaPatchForm({ amount: value })
    },
    [asset, evmPatchForm, solanaPatchForm],
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
      void evmSyncWalletState()
      return
    }

    void solanaSyncWalletState()
  }, [asset, evmSyncWalletState, solanaSyncWalletState])

  const handleConnect = useCallback(() => {
    if (asset === 'eth') {
      void evmConnectWallet()
      return
    }

    void solanaConnectWallet()
  }, [asset, evmConnectWallet, solanaConnectWallet])

  const handleSubmit = useCallback(() => {
    if (asset === 'eth') {
      void evmSendTransfer()
      return
    }

    void solanaSendTransfer()
  }, [asset, evmSendTransfer, solanaSendTransfer])

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
