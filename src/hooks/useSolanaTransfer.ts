import {
  address as solAddress,
  appendTransactionMessageInstruction,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  getTransactionEncoder,
  isAddress as isSolAddress,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Signature,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LAMPORTS_PER_SOL, solanaRpc } from '../lib/chains'
import {
  clearedTransferForm,
  solanaInitialForm,
  solanaInitialStatusText,
} from '../lib/constants'
import { getSolanaProvider, getSolanaWalletName } from '../lib/providers'
import { createStatus, readErrorMessage } from '../lib/utils'
import type { TransferForm } from '../lib/types'

export function useSolanaTransfer() {
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [pending, setPending] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [form, setForm] = useState<TransferForm>(solanaInitialForm)
  const [status, setStatus] = useState(createStatus('neutral', solanaInitialStatusText))

  const resetTimerRef = useRef<number | null>(null)

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  const scheduleTransferReset = useCallback(() => {
    clearResetTimer()
    resetTimerRef.current = window.setTimeout(() => {
      setForm(clearedTransferForm)
      setSignature(null)
      setStatus(createStatus('neutral', '钱包已就绪。请重新填写地址和金额，继续发起 SOL 转账。'))
      resetTimerRef.current = null
    }, 2600)
  }, [clearResetTimer])

  const syncWalletState = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      // 流程 1: 读取 provider/地址 -> 拉取余额 -> 统一更新连接状态文案。
      const provider = getSolanaProvider()

      if (!provider) {
        setAddress(null)
        setBalance(0)

        if (!silent && !pending) {
          setStatus(createStatus('warning', '当前浏览器里没有检测到 Solana 钱包，请先安装 Phantom。'))
        }

        return
      }

      const nextAddress =
        provider.isConnected && provider.publicKey ? provider.publicKey.toBase58() : null

      setAddress(nextAddress)

      if (provider.publicKey) {
        const { value: balanceLamports } = await solanaRpc
          .getBalance(solAddress(provider.publicKey.toBase58()), { commitment: 'confirmed' })
          .send()
        setBalance(Number(balanceLamports) / LAMPORTS_PER_SOL)
      } else {
        setBalance(0)
      }

      if (silent || pending) {
        return
      }

      if (!nextAddress) {
        setStatus(
          createStatus('neutral', `${getSolanaWalletName(provider)} 已就绪。点击 Connect Solana Wallet 开始连接。`),
        )
        return
      }

      setStatus(createStatus('success', `${getSolanaWalletName(provider)} 已连接，可以发送 Devnet SOL。`))
    },
    [pending],
  )

  useEffect(() => {
    // 流程 2: 监听钱包事件并轮询，确保切账号/切窗口后状态仍准确。
    const provider = getSolanaProvider()

    const runSync = (silent = false) => {
      void syncWalletState({ silent })
    }

    const handleWalletChanged = () => {
      setSignature(null)
      runSync()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync()
      }
    }

    runSync()
    provider?.on?.('connect', handleWalletChanged)
    provider?.on?.('disconnect', handleWalletChanged)
    provider?.on?.('accountChanged', handleWalletChanged)

    const pollId = window.setInterval(() => {
      runSync(true)
    }, 1500)

    window.addEventListener('focus', handleWalletChanged)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(pollId)
      window.removeEventListener('focus', handleWalletChanged)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      provider?.removeListener?.('connect', handleWalletChanged)
      provider?.removeListener?.('disconnect', handleWalletChanged)
      provider?.removeListener?.('accountChanged', handleWalletChanged)
    }
  }, [syncWalletState])

  useEffect(() => {
    return () => {
      clearResetTimer()
    }
  }, [clearResetTimer])

  const connectWallet = useCallback(async () => {
    // 流程 3: 主动触发钱包授权连接。
    const provider = getSolanaProvider()

    if (!provider) {
      setStatus(createStatus('warning', '没有检测到 Solana 钱包。请先安装 Phantom。'))
      return
    }

    try {
      clearResetTimer()
      setPending(true)
      setSignature(null)

      const response = await provider.connect()
      setAddress(response.publicKey.toBase58())
      setStatus(createStatus('success', `${getSolanaWalletName(provider)} 已连接，可以发送 Devnet SOL。`))
      await syncWalletState({ silent: true })
    } catch (error) {
      setStatus(createStatus('error', readErrorMessage(error, '连接 Solana 钱包失败，请在钱包里确认授权。')))
    } finally {
      setPending(false)
    }
  }, [clearResetTimer, syncWalletState])

  const sendTransfer = useCallback(async () => {
    // 流程 4: 构造交易消息 -> 钱包签名发送 -> 轮询确认 -> 刷新余额与表单。
    const provider = getSolanaProvider()

    if (!provider) {
      setStatus(createStatus('warning', '没有检测到 Solana 钱包。'))
      return
    }

    try {
      clearResetTimer()
      setPending(true)
      setSignature(null)

      if (!provider.publicKey) {
        await provider.connect()
      }

      const sender = provider.publicKey

      if (!sender) {
        throw new Error('钱包连接成功后仍未读取到公钥。')
      }

      const recipientRaw = form.to.trim()
      const senderAddress = solAddress(sender.toBase58())
      const recipientAddress = solAddress(recipientRaw)
      const transferLamports = Math.round(Number(form.amount.trim()) * LAMPORTS_PER_SOL)

      if (!Number.isFinite(transferLamports) || transferLamports <= 0) {
        throw new Error('SOL 金额必须大于 0。')
      }

      if (!isSolAddress(recipientRaw)) {
        throw new Error('请输入有效的 Solana 地址。')
      }

      const { value: latestBlockhash } = await solanaRpc
        .getLatestBlockhash({ commitment: 'confirmed' })
        .send()

      const transferInstruction = getTransferSolInstruction({
        source: createNoopSigner(senderAddress),
        destination: recipientAddress,
        amount: lamports(BigInt(transferLamports)),
      })

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayer(senderAddress, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(transferInstruction, tx),
      )

      const compiledTransaction = compileTransaction(transactionMessage)
      const transactionBytes = new Uint8Array(getTransactionEncoder().encode(compiledTransaction))

      setStatus(createStatus('neutral', '交易已发起，等待钱包签名并提交到 Solana Devnet...'))

      const result = await provider.signAndSendTransaction(transactionBytes)
      const nextSignature = typeof result === 'string' ? result : result.signature

      setSignature(nextSignature)
      setStatus(createStatus('neutral', '交易已广播，正在等待 Devnet 确认...'))

      const pollConfirmation = async () => {
        for (let i = 0; i < 60; i++) {
          const { value: statuses } = await solanaRpc
            .getSignatureStatuses([nextSignature as Signature])
            .send()
          const nextStatus = statuses[0]
          if (nextStatus && nextStatus.confirmationStatus === 'confirmed') {
            return
          }
          if (nextStatus && nextStatus.confirmationStatus === 'finalized') {
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        throw new Error('交易确认超时。')
      }

      await pollConfirmation()
      await syncWalletState({ silent: true })
      setStatus(createStatus('success', 'SOL 转账已在 Devnet 确认，可以截图或录屏作为作业证明。'))
      scheduleTransferReset()
    } catch (error) {
      setStatus(createStatus('error', readErrorMessage(error, 'SOL 转账失败，请确认地址、网络和余额。')))
    } finally {
      setPending(false)
    }
  }, [clearResetTimer, form.amount, form.to, scheduleTransferReset, syncWalletState])

  const patchForm = useCallback((patch: Partial<TransferForm>) => {
    setForm((current) => ({ ...current, ...patch }))
  }, [])

  return useMemo(
    () => ({
      address,
      balance,
      pending,
      signature,
      form,
      status,
      walletName: getSolanaWalletName(getSolanaProvider()),
      patchForm,
      syncWalletState,
      connectWallet,
      sendTransfer,
    }),
    [
      address,
      balance,
      connectWallet,
      form,
      patchForm,
      pending,
      sendTransfer,
      signature,
      status,
      syncWalletState,
    ],
  )
}
