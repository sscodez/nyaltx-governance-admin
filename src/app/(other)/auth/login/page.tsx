import type { Metadata } from 'next'
import LoginView from './LoginView'

export const metadata: Metadata = { title: 'Connect Wallet' }

const LoginPage = () => <LoginView />

export default LoginPage
