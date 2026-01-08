import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

import logo from '@/assets/images/logo.png'
import logoDark from '@/assets/images/logo-dark.png'

type AuthLogoProps = {
  className?: string
}

const AuthLogo = ({ className }: AuthLogoProps) => {
  return (
    <div className={clsx('auth-brand p-4 text-center', className)}>
      <Link href="/" className="logo-light">
        <Image src={logo} alt="logo" height={28} priority />
      </Link>
      <Link href="/" className="logo-dark">
        <Image src={logoDark} alt="dark logo" height={28} priority />
      </Link>
    </div>
  )
}
export default AuthLogo
