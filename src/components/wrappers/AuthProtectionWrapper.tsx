'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense } from 'react'

import FallbackLoading from '../FallbackLoading'
import type { ChildrenType } from '@/types/component-props'
import { useWalletContext } from '@/context/useWalletContext'

const AuthProtectionWrapper = ({ children }: ChildrenType) => {
  const { address, ready } = useWalletContext()
  const { push } = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (ready && !address) {
      push(`/auth/login?redirectTo=${pathname}`)
    }
  }, [ready, address, pathname, push])

  if (!ready) {
    return <FallbackLoading />
  }

  if (!address) {
    return <FallbackLoading />
  }

  return <Suspense>{children}</Suspense>
}

export default AuthProtectionWrapper
