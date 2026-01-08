'use client'

import { MetaMaskSDK } from '@metamask/sdk'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import type { ChildrenType } from '@/types/component-props'

type WalletContextType = {
  address?: string
  connecting: boolean
  hasProvider: boolean
  ready: boolean
  walletProvider: any | null
  connectWallet: () => Promise<string>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider = ({ children }: ChildrenType) => {
  const [address, setAddress] = useState<string | undefined>()
  const [connecting, setConnecting] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  const [ready, setReady] = useState(false)
  const sdkRef = useRef<MetaMaskSDK | null>(null)
  const providerRef = useRef<any>(null)
  const [walletProvider, setWalletProvider] = useState<any | null>(null)

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

    provider.on('accountsChanged', handleAccountsChanged)
    provider.on('disconnect', handleDisconnect)

    return () => {
      if (typeof provider.removeListener === 'function') {
        provider.removeListener('accountsChanged', handleAccountsChanged)
        provider.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [ready])

  const connectWallet = async () => {
    if (!providerRef.current) {
      throw new Error('MetaMask is not available. Please install or enable the extension to continue.')
    }
    setConnecting(true)
    try {
      const accounts = await providerRef.current.request({ method: 'eth_requestAccounts' })
      const account = accounts?.[0]
      if (!account) {
        throw new Error('No wallet address returned from MetaMask.')
      }
      setAddress(account)
      window.localStorage.setItem('walletAddress', account)
      return account
    } catch (error: any) {
      throw new Error(error?.message || 'Unable to connect to MetaMask. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setAddress(undefined)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('walletAddress')
    }
    setWalletProvider(providerRef.current)
  }

  const value = useMemo(
    () => ({ address, connecting, hasProvider, ready, walletProvider, connectWallet, disconnectWallet }),
    [address, connecting, hasProvider, ready, walletProvider]
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
