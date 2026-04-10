import { sepolia } from 'viem/chains'
import { evmWalletPriority } from './constants'
import type { EvmWalletKind, EvmWalletOption } from './types'

export function getInjectedEvmProviders() {
  const provider = window.ethereum

  if (!provider) {
    return []
  }

  if (!provider.providers?.length) {
    return [provider]
  }

  return Array.from(new Set(provider.providers))
}

export function getEvmWalletKind(provider: Eip1193Provider): EvmWalletKind {
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

export function getEvmWalletLabel(kind: EvmWalletKind) {
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

export function getInstalledEvmWalletOptions(): EvmWalletOption[] {
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

export function getDefaultEvmWalletKind() {
  return getInstalledEvmWalletOptions()[0]?.kind ?? 'metamask'
}

export function getEvmProvider(preferredKind: EvmWalletKind) {
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

export function resolveActiveEvmAccount(provider: Eip1193Provider, accounts: string[]) {
  const selectedAddress = provider.selectedAddress ?? null

  if (!selectedAddress) {
    return accounts[0] ?? null
  }

  if (!accounts.length || accounts.includes(selectedAddress)) {
    return selectedAddress
  }

  return accounts[0] ?? selectedAddress
}

export function getSolanaProvider() {
  if (window.phantom?.solana) {
    return window.phantom.solana
  }

  if (window.solana) {
    return window.solana
  }

  return null
}

export function getSolanaWalletName(provider: SolanaWalletProvider | null) {
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

export async function ensureSepolia(provider: Eip1193Provider, sepoliaChainId: string) {
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
