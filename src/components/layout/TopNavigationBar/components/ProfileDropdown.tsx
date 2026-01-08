'use client'
import { useMemo } from 'react'
import Image from 'next/image'
import { Dropdown, DropdownHeader, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import blockies from 'ethereum-blockies'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

const ProfileDropdown = () => {
  const blockieDataUrl = useMemo(() => {
    const blockie = blockies.create({ seed: 'nyax-admin', size: 8, scale: 4 })
    return blockie.toDataURL()
  }, [])

  return (
    <Dropdown>
      <DropdownToggle as="a" className="nav-link arrow-none nav-user" role="button" aria-haspopup="false" aria-expanded="false">
        <span className="account-user-avatar">
          <Image src={blockieDataUrl} alt="NYAX Admin avatar" width={32} height={32} className="rounded-circle" unoptimized />
        </span>
        <span className="d-lg-block d-none">
          <h5 className="my-0 fw-normal">
            NYAX Admin
            <IconifyIcon icon="ri:arrow-down-s-line" className="fs-22 d-none d-sm-inline-block align-middle" />
          </h5>
        </span>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end dropdown-menu-animated profile-dropdown">
        <DropdownHeader className="noti-title">
          <h6 className="text-overflow m-0">Welcome !</h6>
        </DropdownHeader>
        <Link href="/pages/profile" className="dropdown-item">
          <IconifyIcon icon="ri:account-pin-circle-line" className="fs-16 align-middle me-1 " />
          <span>My Account</span>
        </Link>
        <Link href="/pages/profile" className="dropdown-item">
          <IconifyIcon icon="ri:settings-4-line" className="fs-16 align-middle me-1" />
          <span>Settings</span>
        </Link>
        <Link href="/pages/faq" className="dropdown-item">
          <IconifyIcon icon="ri:customer-service-2-line" className="fs-16 align-middle me-1" />
          <span>Support</span>
        </Link>
        <Link href="/auth/lock-screen" className="dropdown-item">
          <IconifyIcon icon="ri:lock-line" className="fs-16 align-middle me-1" />
          <span>Lock Screen</span>
        </Link>
        <Link href="/auth/logout" onClick={() => signOut({ redirect: false })} className="dropdown-item">
          <IconifyIcon icon="ri:logout-circle-r-line" className="align-middle me-1" />
          <span>Logout</span>
        </Link>
      </DropdownMenu>
    </Dropdown>
  )
}
export default ProfileDropdown
