import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  address as solAddress,
  createSolanaRpc,
  devnet,
  lamports,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  getTransactionEncoder,
  isAddress as isSolAddress,
  createNoopSigner,
  type Signature,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import {
  ArrowLeft,
  ArrowRightLeft,
  AtSign,
  Bitcoin,
  CircleHelp,
  ExternalLink,
  History,
  RefreshCcw,
  ScanLine,
  Settings,
  Shield,
  WalletCards,
} from 'lucide-react'
import { createPublicClient, formatEther, http, isAddress, parseEther, toHex } from 'viem'
import { sepolia } from 'viem/chains'

type AssetKey = 'eth' | 'sol'
type StatusTone = 'neutral' | 'success' | 'warning' | 'error'
type EvmWalletKind = 'metamask' | 'rabby' | 'okx' | 'generic'

type StatusState = {
  tone: StatusTone
  text: string
}

type AssetConfig = {
  icon: typeof Bitcoin
  label: string
  network: string
  recipientHint: string
  symbol: string
  tone: string
}

type EvmWalletOption = {
  kind: EvmWalletKind
  label: string
}

const assetMap: Record<AssetKey, AssetConfig> = {
  eth: {
    icon: Bitcoin,
    label: 'ETH',
    network: 'Sepolia Testnet',
    recipientHint: '0x... or ENS name',
    symbol: 'ETH',
    tone: 'from-[#94AAFF] to-[#3768FA]',
  },
  sol: {
    icon: WalletCards,
    label: 'SOL',
    network: 'Solana Devnet',
    recipientHint: 'Solana address',
    symbol: 'SOL',
    tone: 'from-[#99F6E4] to-[#14B8A6]',
  },
}

const navItems = [
  { icon: WalletCards, label: 'Wallet', active: false },
  { icon: ArrowRightLeft, label: 'Transfer', active: true },
  { icon: History, label: 'History', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

const homeworkChecklist = [
  '连接 EVM 钱包并切到 Sepolia',
  '连接 Solana 钱包并切到 Devnet',
  '页面中包含按钮和文本框',
  '完成一次 ETH 转账与一次 SOL 转账',
]

const deliveryItems = ['代码讲解', '代码仓库', '项目链接']
const evmWalletPriority: EvmWalletKind[] = ['metamask', 'rabby', 'okx', 'generic']
const evmInitialForm = { to: '', amount: '0.001' }
const solanaInitialForm = { to: '', amount: '0.01' }
const clearedTransferForm = { to: '', amount: '' }

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(),
})

const solanaRpc = createSolanaRpc(devnet('https://api.devnet.solana.com'))
const LAMPORTS_PER_SOL = 1_000_000_000
const sepoliaChainId = '0xaa36a7'

function createStatus(tone: StatusTone, text: string): StatusState {
  return { tone, text }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatAmount(value: number, symbol: string, digits = 3) {
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)} ${symbol}`
}

function shortenAddress(address: string | null) {
  if (!address) {
    return 'Not connected'
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getEvmExplorerLink(hash: string) {
  return `${sepolia.blockExplorers.default.url}/tx/${hash}`
}

function getSolanaExplorerLink(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
}

function readErrorMessage(error: unknown, fallback: string) {
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

function getInjectedEvmProviders() {
  const provider = window.ethereum

  if (!provider) {
    return []
  }

  if (!provider.providers?.length) {
    return [provider]
  }

  return Array.from(new Set(provider.providers))
}

function getEvmWalletKind(provider: Eip1193Provider): EvmWalletKind {
  if (provider.isRabby) {
    return 'rabby'
  }

  if (provider.isOkxWallet || provider.isOKExWallet) {
    return 'okx'
  }

  if (provider.isMetaMask) {
    return 'metamask'
  }

  return 'generic'
}

function getEvmWalletLabel(kind: EvmWalletKind) {
  switch (kind) {
    case 'metamask':
      return 'MetaMask'
    case 'rabby':
      return 'Rabby'
    case 'okx':
      return 'OKX Wallet'
    default:
      return 'Injected Wallet'
  }
}

function getInstalledEvmWalletOptions(): EvmWalletOption[] {
  const providers = getInjectedEvmProviders()
  const seen = new Set<EvmWalletKind>()

  return providers
    .map((provider) => getEvmWalletKind(provider))
    .filter((kind) => {
      if (seen.has(kind)) {
        return false
      }

      seen.add(kind)
      return true
    })
    .sort((left, right) => evmWalletPriority.indexOf(left) - evmWalletPriority.indexOf(right))
    .map((kind) => ({
      kind,
      label: getEvmWalletLabel(kind),
    }))
}

function getDefaultEvmWalletKind() {
  return getInstalledEvmWalletOptions()[0]?.kind ?? 'metamask'
}

function getEvmProvider(preferredKind: EvmWalletKind) {
  const providers = getInjectedEvmProviders()

  if (!providers.length) {
    return null
  }

  const exactMatch = providers.find((candidate) => getEvmWalletKind(candidate) === preferredKind)

  if (exactMatch) {
    return exactMatch
  }

  for (const kind of evmWalletPriority) {
    const nextProvider = providers.find((candidate) => getEvmWalletKind(candidate) === kind)

    if (nextProvider) {
      return nextProvider
    }
  }

  return providers[0]
}

function resolveActiveEvmAccount(provider: Eip1193Provider, accounts: string[]) {
  const selectedAddress = provider.selectedAddress ?? null

  if (!selectedAddress) {
    return accounts[0] ?? null
  }

  if (!accounts.length || accounts.includes(selectedAddress)) {
    return selectedAddress
  }

  return accounts[0] ?? selectedAddress
}

function getSolanaProvider() {
  if (window.phantom?.solana) {
    return window.phantom.solana
  }

  if (window.solana) {
    return window.solana
  }

  return null
}

function getSolanaWalletName(provider: SolanaWalletProvider | null) {
  if (!provider) {
    return 'Solana wallet'
  }

  if (provider.isPhantom) {
    return 'Phantom'
  }

  if (provider.isBackpack) {
    return 'Backpack'
  }

  return 'Solana wallet'
}

async function ensureSepolia(provider: Eip1193Provider) {
  const currentChainId = (await provider.request({
    method: 'eth_chainId',
  })) as string

  if (currentChainId === sepoliaChainId) {
    return currentChainId
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: sepoliaChainId }],
    })
  } catch (error) {
    const switchError = error as { code?: number }

    if (switchError.code !== 4902) {
      throw error
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: sepoliaChainId,
          chainName: sepolia.name,
          nativeCurrency: sepolia.nativeCurrency,
          rpcUrls: sepolia.rpcUrls.default.http,
          blockExplorerUrls: [sepolia.blockExplorers.default.url],
        },
      ],
    })
  }

  return sepoliaChainId
}

function App() {
  const [asset, setAsset] = useState<AssetKey>('eth')
  const [evmWalletKind, setEvmWalletKind] = useState<EvmWalletKind>(() => getDefaultEvmWalletKind())

  const [evmAccount, setEvmAccount] = useState<string | null>(null)
  const [evmChainId, setEvmChainId] = useState<string | null>(null)
  const [evmBalance, setEvmBalance] = useState<number>(0)
  const [evmPending, setEvmPending] = useState(false)
  const [evmTxHash, setEvmTxHash] = useState<string | null>(null)
  const [evmForm, setEvmForm] = useState(evmInitialForm)
  const [evmStatus, setEvmStatus] = useState<StatusState>(
    createStatus(
      'neutral',
      '连接 MetaMask、Rabby 或兼容 EVM 钱包后，就可以在 Sepolia 上完成作业里的 ETH 转账。',
    ),
  )

  const [solanaAddress, setSolanaAddress] = useState<string | null>(null)
  const [solanaBalance, setSolanaBalance] = useState<number>(0)
  const [solanaPending, setSolanaPending] = useState(false)
  const [solanaSignature, setSolanaSignature] = useState<string | null>(null)
  const [solanaForm, setSolanaForm] = useState(solanaInitialForm)
  const [solanaStatus, setSolanaStatus] = useState<StatusState>(
    createStatus(
      'neutral',
      '连接 Phantom 或兼容 Solana 钱包后，就可以在 Devnet 上完成作业里的 SOL 转账。',
    ),
  )

  const evmWalletOptions = getInstalledEvmWalletOptions()
  const evmWalletLabel = getEvmWalletLabel(evmWalletKind)
  const evmResetTimerRef = useRef<number | null>(null)
  const solanaResetTimerRef = useRef<number | null>(null)

  const clearEvmResetTimer = useCallback(() => {
    if (evmResetTimerRef.current !== null) {
      window.clearTimeout(evmResetTimerRef.current)
      evmResetTimerRef.current = null
    }
  }, [])

  const clearSolanaResetTimer = useCallback(() => {
    if (solanaResetTimerRef.current !== null) {
      window.clearTimeout(solanaResetTimerRef.current)
      solanaResetTimerRef.current = null
    }
  }, [])

  const scheduleEvmTransferReset = useCallback(() => {
    clearEvmResetTimer()
    evmResetTimerRef.current = window.setTimeout(() => {
      setEvmForm(clearedTransferForm)
      setEvmTxHash(null)
      setEvmStatus(
        createStatus('neutral', `${evmWalletLabel} 已就绪。请重新填写地址和金额，继续发起 ETH 转账。`),
      )
      evmResetTimerRef.current = null
    }, 2600)
  }, [clearEvmResetTimer, evmWalletLabel])

  const scheduleSolanaTransferReset = useCallback(() => {
    clearSolanaResetTimer()
    solanaResetTimerRef.current = window.setTimeout(() => {
      setSolanaForm(clearedTransferForm)
      setSolanaSignature(null)
      setSolanaStatus(createStatus('neutral', '钱包已就绪。请重新填写地址和金额，继续发起 SOL 转账。'))
      solanaResetTimerRef.current = null
    }, 2600)
  }, [clearSolanaResetTimer])

  const syncEvmWalletState = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const provider = getEvmProvider(evmWalletKind)

      if (!provider) {
        setEvmAccount(null)
        setEvmChainId(null)
        setEvmBalance(0)

        if (!silent && !evmPending) {
          setEvmStatus(
            createStatus('warning', '当前浏览器里没有检测到 EVM 钱包，请先安装 MetaMask 或 Rabby。'),
          )
        }

        return
      }

      try {
        const [accounts, chainId] = await Promise.all([
          provider.request({ method: 'eth_accounts' }) as Promise<string[]>,
          provider.request({ method: 'eth_chainId' }) as Promise<string>,
        ])

        const account = resolveActiveEvmAccount(provider, accounts)
        setEvmAccount(account)
        setEvmChainId(chainId)

        if (account) {
          const liveBalance = await sepoliaClient.getBalance({
            address: account as `0x${string}`,
          })
          setEvmBalance(Number(formatEther(liveBalance)))
        } else {
          setEvmBalance(0)
        }

        if (silent || evmPending) {
          return
        }

        if (!account) {
          setEvmStatus(
            createStatus('neutral', '钱包已就绪。点击 Connect EVM Wallet 开始连接 Sepolia。'),
          )
          return
        }

        setEvmStatus(
          chainId === sepoliaChainId
            ? createStatus('success', '已连接到 Sepolia，可以直接发起 ETH 转账。')
            : createStatus('warning', '钱包已连接，但当前不在 Sepolia。发送时会自动请求切换。'),
        )
      } catch (error) {
        if (!silent && !evmPending) {
          setEvmStatus(
            createStatus(
              'error',
              readErrorMessage(error, '读取 EVM 钱包状态失败，请检查钱包扩展是否正常工作。'),
            ),
          )
        }
      }
    },
    [evmPending, evmWalletKind],
  )

  const syncSolanaWalletState = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const provider = getSolanaProvider()

      if (!provider) {
        setSolanaAddress(null)
        setSolanaBalance(0)

        if (!silent && !solanaPending) {
          setSolanaStatus(
            createStatus('warning', '当前浏览器里没有检测到 Solana 钱包，请先安装 Phantom。'),
          )
        }

        return
      }

      const nextAddress =
        provider.isConnected && provider.publicKey ? provider.publicKey.toBase58() : null

      setSolanaAddress(nextAddress)

      if (provider.publicKey) {
        const { value: balanceLamports } = await solanaRpc
          .getBalance(solAddress(provider.publicKey.toBase58()), { commitment: 'confirmed' })
          .send()
        setSolanaBalance(Number(balanceLamports) / LAMPORTS_PER_SOL)
      } else {
        setSolanaBalance(0)
      }

      if (silent || solanaPending) {
        return
      }

      if (!nextAddress) {
        setSolanaStatus(
          createStatus(
            'neutral',
            `${getSolanaWalletName(provider)} 已就绪。点击 Connect Solana Wallet 开始连接。`,
          ),
        )
        return
      }

      setSolanaStatus(
        createStatus('success', `${getSolanaWalletName(provider)} 已连接，可以发送 Devnet SOL。`),
      )
    },
    [solanaPending],
  )

  useEffect(() => {
    const provider = getEvmProvider(evmWalletKind)
    let active = true

    const runSync = (silent = false) => {
      if (!active) {
        return
      }

      void syncEvmWalletState({ silent })
    }

    const handleWalletChanged = () => {
      setEvmTxHash(null)
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
  }, [evmWalletKind, syncEvmWalletState])

  useEffect(() => {
    return () => {
      clearEvmResetTimer()
      clearSolanaResetTimer()
    }
  }, [clearEvmResetTimer, clearSolanaResetTimer])

  useEffect(() => {
    if (!evmWalletOptions.length) {
      return
    }

    if (evmWalletOptions.some((option) => option.kind === evmWalletKind)) {
      return
    }

    setEvmWalletKind(evmWalletOptions[0].kind)
  }, [evmWalletKind, evmWalletOptions])

  useEffect(() => {
    const provider = getSolanaProvider()

    const runSync = (silent = false) => {
      void syncSolanaWalletState({ silent })
    }

    const handleWalletChanged = () => {
      setSolanaSignature(null)
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
  }, [syncSolanaWalletState])

  const connectEvmWallet = async () => {
    const provider = getEvmProvider(evmWalletKind)

    if (!provider) {
      setEvmStatus(
        createStatus('warning', '没有检测到 EVM 钱包。请先安装 MetaMask、Rabby 或 OKX Wallet。'),
      )
      return
    }

    try {
      clearEvmResetTimer()
      setEvmPending(true)
      setEvmTxHash(null)

      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const chainId = await ensureSepolia(provider)

      setEvmAccount(resolveActiveEvmAccount(provider, accounts))
      setEvmChainId(chainId)
      setEvmStatus(
        createStatus('success', `${evmWalletLabel} 连接成功，且已准备在 Sepolia 上发起转账。`),
      )
      await syncEvmWalletState({ silent: true })
    } catch (error) {
      setEvmStatus(
        createStatus('error', readErrorMessage(error, '连接 EVM 钱包失败，请在钱包里确认授权。')),
      )
    } finally {
      setEvmPending(false)
    }
  }

  const connectSolanaWallet = async () => {
    const provider = getSolanaProvider()

    if (!provider) {
      setSolanaStatus(createStatus('warning', '没有检测到 Solana 钱包。请先安装 Phantom。'))
      return
    }

    try {
      clearSolanaResetTimer()
      setSolanaPending(true)
      setSolanaSignature(null)

      const response = await provider.connect()
      setSolanaAddress(response.publicKey.toBase58())
      setSolanaStatus(
        createStatus('success', `${getSolanaWalletName(provider)} 已连接，可以发送 Devnet SOL。`),
      )
      await syncSolanaWalletState({ silent: true })
    } catch (error) {
      setSolanaStatus(
        createStatus('error', readErrorMessage(error, '连接 Solana 钱包失败，请在钱包里确认授权。')),
      )
    } finally {
      setSolanaPending(false)
    }
  }

  const sendEvmTransfer = async () => {
    const provider = getEvmProvider(evmWalletKind)

    if (!provider) {
      setEvmStatus(createStatus('warning', '没有检测到 EVM 钱包。'))
      return
    }

    if (!evmAccount) {
      setEvmStatus(createStatus('warning', '请先连接 EVM 钱包。'))
      return
    }

    if (!isAddress(evmForm.to.trim())) {
      setEvmStatus(createStatus('error', '请输入有效的 EVM 收款地址。'))
      return
    }

    try {
      clearEvmResetTimer()
      const value = parseEther(evmForm.amount.trim())

      if (value <= 0n) {
        throw new Error('ETH 金额必须大于 0。')
      }

      setEvmPending(true)
      setEvmTxHash(null)
      await ensureSepolia(provider)
      setEvmChainId(sepoliaChainId)
      setEvmStatus(createStatus('neutral', '交易已发起，等待钱包签名并提交到 Sepolia...'))

      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: evmAccount,
            to: evmForm.to.trim(),
            value: toHex(value),
          },
        ],
      })) as string

      setEvmTxHash(hash)
      setEvmStatus(createStatus('neutral', '交易已广播，正在等待 Sepolia 确认...'))
      await sepoliaClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
      })
      await syncEvmWalletState({ silent: true })
      setEvmStatus(createStatus('success', 'ETH 转账已在 Sepolia 确认，可以截图或录屏作为作业证明。'))
      scheduleEvmTransferReset()
    } catch (error) {
      setEvmStatus(
        createStatus('error', readErrorMessage(error, 'ETH 转账失败，请确认余额、地址和网络。')),
      )
    } finally {
      setEvmPending(false)
    }
  }

  const sendSolanaTransfer = async () => {
    const provider = getSolanaProvider()

    if (!provider) {
      setSolanaStatus(createStatus('warning', '没有检测到 Solana 钱包。'))
      return
    }

    try {
      clearSolanaResetTimer()
      setSolanaPending(true)
      setSolanaSignature(null)

      if (!provider.publicKey) {
        await provider.connect()
      }

      const sender = provider.publicKey

      if (!sender) {
        throw new Error('钱包连接成功后仍未读取到公钥。')
      }

      const senderAddress = solAddress(sender.toBase58())
      const recipientAddress = solAddress(solanaForm.to.trim())
      const transferLamports = Math.round(Number(solanaForm.amount.trim()) * LAMPORTS_PER_SOL)

      if (!Number.isFinite(transferLamports) || transferLamports <= 0) {
        throw new Error('SOL 金额必须大于 0。')
      }

      if (!isSolAddress(solanaForm.to.trim())) {
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

      setSolanaStatus(createStatus('neutral', '交易已发起，等待钱包签名并提交到 Solana Devnet...'))

      const result = await provider.signAndSendTransaction(transactionBytes)
      const signature = typeof result === 'string' ? result : result.signature

      setSolanaSignature(signature)
      setSolanaStatus(createStatus('neutral', '交易已广播，正在等待 Devnet 确认...'))

      // Poll for confirmation since the wallet already sent the transaction
      const pollConfirmation = async () => {
        for (let i = 0; i < 60; i++) {
          const { value: statuses } = await solanaRpc
            .getSignatureStatuses([signature as Signature])
            .send()
          const status = statuses[0]
          if (status && status.confirmationStatus === 'confirmed') return
          if (status && status.confirmationStatus === 'finalized') return
          await new Promise((r) => setTimeout(r, 1000))
        }
        throw new Error('交易确认超时。')
      }
      await pollConfirmation()

      await syncSolanaWalletState({ silent: true })
      setSolanaStatus(createStatus('success', 'SOL 转账已在 Devnet 确认，可以截图或录屏作为作业证明。'))
      scheduleSolanaTransferReset()
    } catch (error) {
      setSolanaStatus(
        createStatus('error', readErrorMessage(error, 'SOL 转账失败，请确认地址、网络和余额。')),
      )
    } finally {
      setSolanaPending(false)
    }
  }

  const currentAsset = assetMap[asset]
  const currentPending = asset === 'eth' ? evmPending : solanaPending
  const currentConnectedAccount = asset === 'eth' ? evmAccount : solanaAddress
  const currentBalance = asset === 'eth' ? evmBalance : solanaBalance
  const currentStatus = asset === 'eth' ? evmStatus : solanaStatus
  const currentLink = asset === 'eth' ? evmTxHash : solanaSignature
  const currentForm = asset === 'eth' ? evmForm : solanaForm

  const amountNumber = Number(currentForm.amount)
  const isValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const fiatRate = asset === 'eth' ? 2472 : 132.48
  const fiatValue = isValidAmount ? amountNumber * fiatRate : 0
  const gasFee = asset === 'eth' ? 0.0012 : 0.00018
  const gasFeeFiat = gasFee * fiatRate
  const willOverflow = isValidAmount && amountNumber > currentBalance
  const canSubmit =
    currentConnectedAccount !== null && currentForm.to.trim().length > 0 && isValidAmount && !willOverflow

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

  const handlePasteRecipient = () => {
    navigator.clipboard
      ?.readText()
      .then((text) => {
        if (!text) {
          return
        }

        if (asset === 'eth') {
          setEvmForm((current) => ({ ...current, to: text }))
        } else {
          setSolanaForm((current) => ({ ...current, to: text }))
        }
      })
      .catch(() => undefined)
  }

  const handleSetMax = () => {
    const nextAmount = currentBalance > 0 ? currentBalance.toFixed(asset === 'eth' ? 4 : 3) : ''

    if (asset === 'eth') {
      setEvmForm((current) => ({ ...current, amount: nextAmount }))
      return
    }

    setSolanaForm((current) => ({ ...current, amount: nextAmount }))
  }

  const handleRefresh = () => {
    if (asset === 'eth') {
      void syncEvmWalletState()
      return
    }

    void syncSolanaWalletState()
  }

  const handleConnect = () => {
    if (asset === 'eth') {
      void connectEvmWallet()
      return
    }

    void connectSolanaWallet()
  }

  const handleSubmit = () => {
    if (asset === 'eth') {
      void sendEvmTransfer()
      return
    }

    void sendSolanaTransfer()
  }

  const txLink = currentLink
    ? asset === 'eth'
      ? getEvmExplorerLink(currentLink)
      : getSolanaExplorerLink(currentLink)
    : null

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-on-surface sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.36em] text-primary">
              Web3 Homework
            </p>
            <h1 className="max-w-xl font-headline text-5xl font-extrabold leading-[0.95] text-white">
              用 Stitch UI 跑通老师布置的最小 Web3 前端作业。
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-on-surface-variant">
              这个页面直接对应你 Obsidian 笔记里的作业：准备两个钱包、领取测试网资产、做一个最小
              页面，并完成一笔 Sepolia ETH 转账和一笔 Solana Devnet 转账。
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-white/6 bg-white/[0.03] p-5 shadow-soft">
                <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                  作业清单
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
                  {homeworkChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-3xl border border-white/6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 shadow-soft">
                <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                  提交物
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
                  {deliveryItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-6 text-on-surface-variant">
                  完成两笔测试网交易后，把交易链接、运行录屏和代码讲解放进你的作业说明里就可以了。
                </p>
              </article>
            </div>
          </section>

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
                        onClick={() => setAsset(key)}
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
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-on-surface-variant">
                    Available balance
                  </p>
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
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {formatCurrency(currentBalance * fiatRate)} USD
                  </p>
                </section>

                <div className="rounded-2xl border border-white/5 bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] uppercase tracking-[0.24em] text-on-surface-variant">
                        Connected account
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {shortenAddress(currentConnectedAccount)}
                      </p>
                      <p className="mt-1 text-[0.72rem] text-on-surface-variant">
                        {asset === 'eth'
                          ? evmChainId === sepoliaChainId
                            ? `${evmWalletLabel} • Sepolia ready`
                            : evmChainId
                              ? `${evmWalletLabel} • Wrong chain: ${evmChainId}`
                              : `${evmWalletLabel} • Waiting for wallet`
                          : getSolanaWalletName(getSolanaProvider())}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={currentPending}
                        className="grid size-10 place-items-center rounded-xl bg-surface-container-high text-on-surface-variant transition hover:text-white disabled:opacity-60"
                        aria-label="Refresh wallet state"
                      >
                        <RefreshCcw size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={handleConnect}
                        disabled={currentPending}
                        className="rounded-xl bg-[linear-gradient(135deg,#94aaff_0%,#3768fa_100%)] px-3 py-2 text-xs font-bold text-[#0C1233] transition hover:brightness-110 disabled:opacity-60"
                      >
                        {currentPending
                          ? 'Loading...'
                          : currentConnectedAccount
                            ? 'Reconnect'
                            : 'Connect'}
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
                    <p className="mb-3 text-[0.65rem] uppercase tracking-[0.24em] text-on-surface-variant">
                      Active EVM wallet
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {evmWalletOptions.map((option) => (
                        <button
                          key={option.kind}
                          type="button"
                          onClick={() => setEvmWalletKind(option.kind)}
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

              <section className="mt-7 space-y-5">
                <label className="block">
                  <span className="mb-2 block px-1 text-[0.7rem] font-medium text-on-surface-variant">
                    Recipient Address
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface-container-low px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/35">
                    <AtSign size={18} className="text-on-surface-variant" />
                    <input
                      type="text"
                      value={currentForm.to}
                      onChange={(event) => {
                        const value = event.target.value

                        if (asset === 'eth') {
                          setEvmForm((current) => ({ ...current, to: value }))
                          return
                        }

                        setSolanaForm((current) => ({ ...current, to: value }))
                      }}
                      placeholder={currentAsset.recipientHint}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-outline"
                    />
                    <button
                      type="button"
                      onClick={handlePasteRecipient}
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
                  <span className="mb-2 block px-1 text-[0.7rem] font-medium text-on-surface-variant">
                    Amount to Send
                  </span>
                  <div className="rounded-2xl border border-white/5 bg-surface-container-low px-4 py-4 transition focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/35">
                    <div className="flex items-start justify-between gap-4">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.001"
                        value={currentForm.amount}
                        onChange={(event) => {
                          const value = event.target.value

                          if (asset === 'eth') {
                            setEvmForm((current) => ({ ...current, amount: value }))
                            return
                          }

                          setSolanaForm((current) => ({ ...current, amount: value }))
                        }}
                        placeholder="0.00"
                        className="w-full bg-transparent font-headline text-[2rem] font-bold tracking-[-0.05em] text-white outline-none placeholder:text-outline-variant"
                      />

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{currentAsset.symbol}</span>
                        <button
                          type="button"
                          onClick={handleSetMax}
                          className="rounded-md bg-surface-container-highest px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-tight text-primary transition hover:text-white"
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[0.72rem] text-on-surface-variant">
                      <span>{currentForm.amount ? `≈ ${formatCurrency(fiatValue)} USD` : '≈ $0.00 USD'}</span>
                      <span>Network: {currentAsset.network}</span>
                    </div>
                  </div>
                </label>

                <div className="rounded-[1.4rem] border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">Estimated Gas Fee</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatAmount(gasFee, currentAsset.symbol, 5)}
                      </p>
                      <p className="text-[0.65rem] text-on-surface-variant">
                        {formatCurrency(gasFeeFiat)} USD
                      </p>
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
                  Ensure the recipient address is on the{' '}
                  <span className="font-medium text-white">{currentAsset.network}</span>. Transactions
                  on the blockchain are irreversible and may result in permanent loss of funds if sent
                  to the wrong address.
                </p>
              </div>
            </div>

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
                  <span>
                    {currentForm.to
                      ? `${currentForm.to.slice(0, 6)}...${currentForm.to.slice(-4)}`
                      : 'No recipient yet'}
                  </span>
                  <span>{currentForm.amount ? `${currentForm.amount} ${currentAsset.symbol}` : '0.00'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
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
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
