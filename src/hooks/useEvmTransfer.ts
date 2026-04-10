import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatEther, isAddress, parseEther, toHex } from 'viem'
import { sepoliaChainId, sepoliaClient } from '../lib/chains'
import {
  clearedTransferForm,
  evmInitialForm,
  evmInitialStatusText,
} from '../lib/constants'
import {
  ensureSepolia,
  getDefaultEvmWalletKind,
  getEvmProvider,
  getEvmWalletLabel,
  getInstalledEvmWalletOptions,
  resolveActiveEvmAccount,
} from '../lib/providers'
import { createStatus, readErrorMessage } from '../lib/utils'
import type { EvmWalletKind, TransferForm } from '../lib/types'

export function useEvmTransfer() {
  const [walletKind, setWalletKind] = useState<EvmWalletKind>(() => getDefaultEvmWalletKind())
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [pending, setPending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [form, setForm] = useState<TransferForm>(evmInitialForm)
  const [status, setStatus] = useState(createStatus('neutral', evmInitialStatusText))

  // 钱包候选列表每次渲染都重新探测，可响应扩展热插拔和多注入场景。
  const walletOptions = getInstalledEvmWalletOptions()
  const walletLabel = useMemo(() => getEvmWalletLabel(walletKind), [walletKind])
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
      setTxHash(null)
      setStatus(createStatus('neutral', `${walletLabel} 已就绪。请重新填写地址和金额，继续发起 ETH 转账。`))
      resetTimerRef.current = null
    }, 2600)
  }, [clearResetTimer, walletLabel])

  const syncWalletState = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      // 流程 1: 读取 provider -> 读取账号/链 -> 拉余额 -> 统一更新 UI 状态。
      const provider = getEvmProvider(walletKind)

      if (!provider) {
        setAccount(null)
        setChainId(null)
        setBalance(0)

        if (!silent && !pending) {
          setStatus(createStatus('warning', '当前浏览器里没有检测到 EVM 钱包，请先安装 MetaMask 或 Rabby。'))
        }

        return
      }

      try {
        const [accounts, nextChainId] = await Promise.all([
          provider.request({ method: 'eth_accounts' }) as Promise<string[]>,
          provider.request({ method: 'eth_chainId' }) as Promise<string>,
        ])

        const nextAccount = resolveActiveEvmAccount(provider, accounts)
        setAccount(nextAccount)
        setChainId(nextChainId)

        if (nextAccount) {
          const liveBalance = await sepoliaClient.getBalance({
            address: nextAccount as `0x${string}`,
          })
          setBalance(Number(formatEther(liveBalance)))
        } else {
          setBalance(0)
        }

        if (silent || pending) {
          return
        }

        if (!nextAccount) {
          setStatus(createStatus('neutral', '钱包已就绪。点击 Connect EVM Wallet 开始连接 Sepolia。'))
          return
        }

        setStatus(
          nextChainId === sepoliaChainId
            ? createStatus('success', '已连接到 Sepolia，可以直接发起 ETH 转账。')
            : createStatus('warning', '钱包已连接，但当前不在 Sepolia。发送时会自动请求切换。'),
        )
      } catch (error) {
        if (!silent && !pending) {
          setStatus(
            createStatus('error', readErrorMessage(error, '读取 EVM 钱包状态失败，请检查钱包扩展是否正常工作。')),
          )
        }
      }
    },
    [pending, walletKind],
  )

  useEffect(() => {
    // 流程 2: 通过事件 + 轮询双保险，持续同步钱包真实状态。
    const provider = getEvmProvider(walletKind)
    let active = true

    const runSync = (silent = false) => {
      if (!active) {
        return
      }

      void syncWalletState({ silent })
    }

    const handleWalletChanged = () => {
      setTxHash(null)
      runSync()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync()
      }
    }

    runSync()
    provider?.on?.('accountsChanged', handleWalletChanged)
    provider?.on?.('chainChanged', handleWalletChanged)

    const pollId = window.setInterval(() => {
      runSync(true)
    }, 1500)

    window.addEventListener('focus', handleWalletChanged)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.clearInterval(pollId)
      window.removeEventListener('focus', handleWalletChanged)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      provider?.removeListener?.('accountsChanged', handleWalletChanged)
      provider?.removeListener?.('chainChanged', handleWalletChanged)
    }
  }, [walletKind, syncWalletState])

  useEffect(() => {
    return () => {
      clearResetTimer()
    }
  }, [clearResetTimer])

  useEffect(() => {
    if (!walletOptions.length) {
      return
    }

    if (walletOptions.some((option) => option.kind === walletKind)) {
      return
    }

    setWalletKind(walletOptions[0].kind)
  }, [walletKind, walletOptions])

  const connectWallet = useCallback(async () => {
    // 流程 3: 显式连接钱包并确保链切到 Sepolia。
    const provider = getEvmProvider(walletKind)

    if (!provider) {
      setStatus(
        createStatus('warning', '没有检测到 EVM 钱包。请先安装 MetaMask、Rabby 或 OKX Wallet。'),
      )
      return
    }

    try {
      clearResetTimer()
      setPending(true)
      setTxHash(null)

      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const nextChainId = await ensureSepolia(provider, sepoliaChainId)

      setAccount(resolveActiveEvmAccount(provider, accounts))
      setChainId(nextChainId)
      setStatus(createStatus('success', `${walletLabel} 连接成功，且已准备在 Sepolia 上发起转账。`))
      await syncWalletState({ silent: true })
    } catch (error) {
      setStatus(createStatus('error', readErrorMessage(error, '连接 EVM 钱包失败，请在钱包里确认授权。')))
    } finally {
      setPending(false)
    }
  }, [clearResetTimer, syncWalletState, walletKind, walletLabel])

  const sendTransfer = useCallback(async () => {
    // 流程 4: 前置校验 -> 发起交易 -> 等待确认 -> 成功后刷新余额与表单。
    const provider = getEvmProvider(walletKind)

    if (!provider) {
      setStatus(createStatus('warning', '没有检测到 EVM 钱包。'))
      return
    }

    if (!account) {
      setStatus(createStatus('warning', '请先连接 EVM 钱包。'))
      return
    }

    if (!isAddress(form.to.trim())) {
      setStatus(createStatus('error', '请输入有效的 EVM 收款地址。'))
      return
    }

    try {
      clearResetTimer()
      const value = parseEther(form.amount.trim())

      if (value <= 0n) {
        throw new Error('ETH 金额必须大于 0。')
      }

      setPending(true)
      setTxHash(null)
      await ensureSepolia(provider, sepoliaChainId)
      setChainId(sepoliaChainId)
      setStatus(createStatus('neutral', '交易已发起，等待钱包签名并提交到 Sepolia...'))

      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: account,
            to: form.to.trim(),
            value: toHex(value),
          },
        ],
      })) as string

      setTxHash(hash)
      setStatus(createStatus('neutral', '交易已广播，正在等待 Sepolia 确认...'))
      await sepoliaClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      })
      await syncWalletState({ silent: true })
      setStatus(createStatus('success', 'ETH 转账已在 Sepolia 确认，可以截图或录屏作为作业证明。'))
      scheduleTransferReset()
    } catch (error) {
      setStatus(createStatus('error', readErrorMessage(error, 'ETH 转账失败，请确认余额、地址和网络。')))
    } finally {
      setPending(false)
    }
  }, [account, clearResetTimer, form.amount, form.to, scheduleTransferReset, syncWalletState, walletKind])

  const patchForm = useCallback((patch: Partial<TransferForm>) => {
    setForm((current) => ({ ...current, ...patch }))
  }, [])

  return useMemo(
    () => ({
      walletKind,
      setWalletKind,
      walletOptions,
      walletLabel,
      account,
      chainId,
      balance,
      pending,
      txHash,
      form,
      status,
      patchForm,
      connectWallet,
      sendTransfer,
      syncWalletState,
    }),
    [
      account,
      balance,
      chainId,
      connectWallet,
      form,
      patchForm,
      pending,
      sendTransfer,
      status,
      syncWalletState,
      txHash,
      walletKind,
      walletLabel,
      walletOptions,
    ],
  )
}
