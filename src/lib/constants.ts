import { ArrowRightLeft, Bitcoin, History, Settings, WalletCards } from 'lucide-react'
import { sepolia } from 'viem/chains'
import type { AssetConfig, AssetKey, EvmWalletKind, TransferForm } from './types'

export const assetMap: Record<AssetKey, AssetConfig> = {
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

export const navItems = [
  { icon: WalletCards, label: 'Wallet', active: false },
  { icon: ArrowRightLeft, label: 'Transfer', active: true },
  { icon: History, label: 'History', active: false },
  { icon: Settings, label: 'Settings', active: false },
]

export const homeworkChecklist = [
  '连接 EVM 钱包并切到 Sepolia',
  '连接 Solana 钱包并切到 Devnet',
  '页面中包含按钮和文本框',
  '完成一次 ETH 转账与一次 SOL 转账',
]

export const deliveryItems = ['代码讲解', '代码仓库', '项目链接']

export const evmWalletPriority: EvmWalletKind[] = ['metamask', 'rabby', 'okx', 'generic']

export const evmInitialForm: TransferForm = { to: '', amount: '0.001' }
export const solanaInitialForm: TransferForm = { to: '', amount: '0.01' }
export const clearedTransferForm: TransferForm = { to: '', amount: '' }

export const evmInitialStatusText =
  '连接 MetaMask、Rabby 或兼容 EVM 钱包后，就可以在 Sepolia 上完成作业里的 ETH 转账。'

export const solanaInitialStatusText =
  '连接 Phantom 或兼容 Solana 钱包后，就可以在 Devnet 上完成作业里的 SOL 转账。'

export const sepoliaExplorerBaseUrl = sepolia.blockExplorers.default.url
