'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createDAOService, DAOService } from '@/services/contracts'
import { useWalletContext } from '@/context/useWalletContext'

const useDaoService = () => {
  const { walletProvider, ready, address, chainId, disconnectWallet } = useWalletContext()
  const [daoService, setDaoService] = useState<DAOService | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      try {
        const service = await createDAOService(walletProvider)
        if (!cancelled) {
          setDaoService(service)
          setError(null)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to initialize DAO services')
          setDaoService(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (ready) {
      init()
    }

    return () => {
      cancelled = true
    }
  }, [walletProvider, ready, address, chainId])

  useEffect(() => {
    if (!error || redirecting) return

    const logoutAndRedirect = async () => {
      setRedirecting(true)
      try {
        await disconnectWallet()
      } finally {
        router.push('/auth/login')
      }
    }

    logoutAndRedirect()
  }, [error, redirecting, disconnectWallet, router])

  return { daoService, loading, error }
}

export default useDaoService
