'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useWalletContext } from '@/context/useWalletContext'
import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'

const useSignIn = () => {
  const { address, connectWallet, connecting, hasProvider, ready, walletProvider } = useWalletContext()
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const { push } = useRouter()
  const { showNotification } = useNotificationContext()
  const queryParams = useQueryParams()

  useEffect(() => {
    if (!address) {
      setSignature(null)
    }
  }, [address])

  const requestSignature = useCallback(
    async (account: string) => {
      if (!walletProvider?.request) {
        throw new Error('Wallet provider not available for signature. Re-open MetaMask and try again.')
      }
      setSigning(true)
      try {
        const message = `NYAX Admin Login\nAddress: ${account}\nTimestamp: ${new Date().toISOString()}`
        const signedMessage: string = await walletProvider.request({
          method: 'personal_sign',
          params: [message, account],
        })
        setSignature(signedMessage)
        showNotification({
          message: 'Signature verified. Redirecting...',
          variant: 'success',
        })
        return signedMessage
      } finally {
        setSigning(false)
      }
    },
    [walletProvider, showNotification],
  )

  useEffect(() => {
    if (address && signature) {
      push(queryParams['redirectTo'] ?? '/dashboard')
    }
  }, [address, signature, push, queryParams])

  const connect = async () => {
    setError(null)
    try {
      let account = address
      if (!account) {
        account = await connectWallet()
      }
      await requestSignature(account)
    } catch (err: any) {
      setError(err?.message ?? 'Unable to connect wallet. Please try again.')
    }
  }

  return { address, connect, connecting, signing, hasProvider, ready, error, signature }
}

export default useSignIn
