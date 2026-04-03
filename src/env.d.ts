declare global {
  interface Eip1193Provider {
    isMetaMask?: boolean
    isOKExWallet?: boolean
    isOkxWallet?: boolean
    isRabby?: boolean
    providers?: Eip1193Provider[]
    selectedAddress?: string | null
    on?(event: string, listener: (...args: never[]) => void): void
    removeListener?(event: string, listener: (...args: never[]) => void): void
    request(args: {
      method: string
      params?: readonly unknown[] | object
    }): Promise<unknown>
  }

  interface SolanaWalletProvider {
    isBackpack?: boolean
    isConnected?: boolean
    isPhantom?: boolean
    publicKey?: { toBase58(): string } | null
    connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>
    disconnect(): Promise<void>
    on?(event: string, listener: (...args: never[]) => void): void
    removeListener?(event: string, listener: (...args: never[]) => void): void
    signAndSendTransaction(
      transaction: Uint8Array | { serialize(): Uint8Array },
    ): Promise<{ signature: string } | string>
  }

  interface Window {
    ethereum?: Eip1193Provider
    phantom?: {
      solana?: SolanaWalletProvider
    }
    solana?: SolanaWalletProvider
  }
}

export {}
