'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useWalletContext } from '@/context/useWalletContext'
import { useNotificationContext } from '@/context/useNotificationContext'
import useQueryParams from '@/hooks/useQueryParams'

const useSignIn = () => {
  const { address, connectWallet, connecting, hasProvider, ready } = useWalletContext()
  const [error, setError] = useState<string | null>(null)
  const { push } = useRouter()
  const { showNotification } = useNotificationContext()
  const queryParams = useQueryParams()

  useEffect(() => {
    if (address) {
      showNotification({
        message: 'Wallet connected successfully. Redirecting...',
        variant: 'success',
      })
      push(queryParams['redirectTo'] ?? '/dashboard')
    }
  }, [address, push, queryParams, showNotification])

  const connect = async () => {
    setError(null)
    try {
      await connectWallet()
    } catch (err: any) {
      setError(err?.message ?? 'Unable to connect wallet. Please try again.')
    }
  }

  return { address, connect, connecting, hasProvider, ready, error }
}

export default useSignIn
