'use client'

import { Button, Alert, Card } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import useSignIn from './useSignIn'

const LoginForm = () => {
  const { address, connect, connecting, hasProvider, ready, error } = useSignIn()

  return (
    <div className="text-start">
      <Card className="bg-body-tertiary border-0 mb-3">
        <Card.Body>
          <h5 className="fw-semibold mb-2">Connect Wallet</h5>
          <p className="text-muted mb-0">
            Use your MetaMask wallet to authenticate. Once connected, you&apos;ll be redirected back to your dashboard.
          </p>
        </Card.Body>
      </Card>

      {!ready && (
        <Alert variant="info" className="mb-3">
          Initializing MetaMask SDK...
        </Alert>
      )}

      {ready && !hasProvider && (
        <Alert variant="warning" className="mb-3">
          We couldn&apos;t detect MetaMask in your browser. Install the extension and refresh this page or open this site inside the MetaMask mobile
          browser.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Button
        variant={address ? 'success' : 'primary'}
        className="w-100 py-2"
        disabled={connecting || !ready || !hasProvider}
        onClick={connect}>
        {connecting ? (
          'Connecting...'
        ) : address ? (
          <>
            <IconifyIcon icon="ri:checkbox-circle-fill" className="me-1" />
            Wallet Connected
          </>
        ) : (
          <>
            <IconifyIcon icon="ri:wallet-3-line" className="me-1" />
            Connect MetaMask
          </>
        )}
      </Button>
      <p className="text-muted fs-14 mt-3 mb-0">
        Need help? Open the MetaMask extension and ensure you&apos;re on the account you&apos;d like to use for governance.
      </p>
    </div>
  )
}

export default LoginForm
