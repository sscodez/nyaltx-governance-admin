'use client'

import { MetaMaskSDK } from '@metamask/sdk'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import type { ChildrenType } from '@/types/component-props'
import { NETWORK_CONFIG } from '@/services/contracts/config'

type WalletContextType = {
  address?: string
  chainId?: string
  connecting: boolean
  hasProvider: boolean
  ready: boolean
  walletProvider: any | null
  connectWallet: () => Promise<string>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const TARGET_CHAIN_ID_DEC = parseInt(NETWORK_CONFIG.chainId ?? '11155111', 10)
const TARGET_CHAIN_ID_HEX = `0x${TARGET_CHAIN_ID_DEC.toString(16)}`
const NORMALIZED_CHAIN_ID = TARGET_CHAIN_ID_HEX.toLowerCase()

const NETWORK_PARAMS = {
  chainId: TARGET_CHAIN_ID_HEX,
  chainName: 'Ethereum Sepolia Testnet',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [NETWORK_CONFIG.rpcUrl],
  blockExplorerUrls: NETWORK_CONFIG.blockExplorer ? [NETWORK_CONFIG.blockExplorer] : [],
}

export const WalletProvider = ({ children }: ChildrenType) => {
  const [address, setAddress] = useState<string | undefined>()
  const [chainId, setChainId] = useState<string | undefined>()
  const [connecting, setConnecting] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  const [ready, setReady] = useState(false)
  const sdkRef = useRef<MetaMaskSDK | null>(null)
  const providerRef = useRef<any>(null)
  const [walletProvider, setWalletProvider] = useState<any | null>(null)

  const ensureCorrectNetwork = useCallback(async (ethProvider: any) => {
    if (!ethProvider?.request) return

    const currentChain = ((await ethProvider.request({ method: 'eth_chainId' })) as string)?.toLowerCase()
    setChainId(currentChain)

    if (currentChain === NORMALIZED_CHAIN_ID) {
      return
    }

    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_ID_HEX }],
      })
      setChainId(NORMALIZED_CHAIN_ID)
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        try {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_PARAMS],
          })
          setChainId(NORMALIZED_CHAIN_ID)
        } catch (addError: any) {
          throw new Error(addError?.message || 'Unable to add the Sepolia network in MetaMask.')
        }
      } else {
        throw new Error(switchError?.message || 'Please switch your wallet to the Sepolia test network to continue.')
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initializeSdk = async () => {
      try {
        if (!sdkRef.current) {
          sdkRef.current = new MetaMaskSDK({
            dappMetadata: {
              name: 'NYAX Admin',
              url: window.location.origin,
            },
          })
        }
        const sdkProvider = sdkRef.current.getProvider()
        if (sdkProvider) {
          providerRef.current = sdkProvider
        } else if (typeof window !== 'undefined' && (window as any).ethereum) {
          providerRef.current = (window as any).ethereum
        }
        setHasProvider(Boolean(providerRef.current))
        setWalletProvider(providerRef.current)

        if (providerRef.current?.request) {
          try {
            const initialChainId = (await providerRef.current.request({ method: 'eth_chainId' })) as string
            setChainId(initialChainId?.toLowerCase())
          } catch {
            // ignore inability to read chain id eagerly
          }
        }
      } catch (error) {
        setHasProvider(false)
      } finally {
        setReady(true)
      }
    }

    const storedAddress = window.localStorage.getItem('walletAddress')
    if (storedAddress) {
      setAddress(storedAddress)
    }

    initializeSdk()
  }, [])

  useEffect(() => {
    const provider = providerRef.current
    if (!provider || typeof provider.on !== 'function') return

    const handleAccountsChanged = (accounts: string[]) => {
      const account = accounts?.[0]
      setAddress(account)
      if (account) {
        window.localStorage.setItem('walletAddress', account)
      } else {
        window.localStorage.removeItem('walletAddress')
      }
    }

    const handleDisconnect = () => {
      setAddress(undefined)
      window.localStorage.removeItem('walletAddress')
    }

    const handleChainChanged = async (nextChainId: string) => {
      const normalized = nextChainId?.toLowerCase()
      setChainId(normalized)

      if (normalized !== NORMALIZED_CHAIN_ID) {
        setAddress(undefined)
        window.localStorage.removeItem('walletAddress')
        return
      }

      try {
        const accounts = await provider.request({ method: 'eth_accounts' })
        const account = accounts?.[0]
        setAddress(account)
        if (account) {
          window.localStorage.setItem('walletAddress', account)
        }
      } catch (error) {
        console.error('Failed to refresh accounts on chain change', error)
      }
    }

    provider.on('accountsChanged', handleAccountsChanged)
    provider.on('disconnect', handleDisconnect)
    provider.on('chainChanged', handleChainChanged)

    return () => {
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('accountsChanged', handleAccountsChanged)
        provider.removeListener('disconnect', handleDisconnect)
        provider.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [ready])

  const connectWallet = useCallback(async () => {
    if (!providerRef.current) {
      throw new Error('MetaMask is not available. Please install or enable the extension to continue.')
    }
    setConnecting(true)
    try {
      await ensureCorrectNetwork(providerRef.current)
      const accounts = await providerRef.current.request({ method: 'eth_requestAccounts' })
      const account = accounts?.[0]
      if (!account) {
        throw new Error('No wallet address returned from MetaMask.')
      }
      setAddress(account)
      const currentChain = (await providerRef.current.request({ method: 'eth_chainId' })) as string
      setChainId(currentChain?.toLowerCase())
      window.localStorage.setItem('walletAddress', account)
      return account
    } catch (error: any) {
      throw new Error(error?.message || 'Unable to connect to MetaMask. Please try again.')
    } finally {
      setConnecting(false)
    }
  }, [ensureCorrectNetwork])

  const disconnectWallet = useCallback(() => {
    setAddress(undefined)
    setChainId(undefined)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('walletAddress')
    }
    setWalletProvider(providerRef.current)
  }, [])

  const value = useMemo(
    () => ({ address, chainId, connecting, hasProvider, ready, walletProvider, connectWallet, disconnectWallet }),
    [address, chainId, connecting, hasProvider, ready, walletProvider, connectWallet, disconnectWallet]
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export const useWalletContext = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider')
  }
  return context
}
