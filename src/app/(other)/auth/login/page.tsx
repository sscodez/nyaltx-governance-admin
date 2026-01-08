import type { Metadata } from 'next'
import { Card, Col, Container, Row } from 'react-bootstrap'

import AuthLogo from '@/components/AuthLogo'
import LoginForm from './components/LoginForm'

export const metadata: Metadata = { title: 'Connect Wallet' }

const Login = () => {
  return (
    <div className="account-pages p-sm-5 position-relative">
      <Container>
        <Row className="justify-content-center">
          <Col xxl={7} lg={8}>
            <Card className="border-0 shadow-lg">
              <Card.Body className="p-4 p-md-5">
                <div className="text-center mb-4">
                  <AuthLogo />
                </div>
                <div className="text-center">
                  <h4 className="fw-semibold mb-2">Connect your wallet</h4>
                  <p className="text-muted mb-4">
                    Secure, passwordless access to the NYAX governance console. Connect your MetaMask wallet to continue.
                  </p>
                </div>
                <LoginForm />
                <div className="mt-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span className="badge bg-soft-primary text-primary rounded-pill px-3 py-2 fw-semibold">Why wallet login?</span>
                    <span className="text-muted small">Real-time verification · No passwords</span>
                  </div>
                  <ul className="list-unstyled text-muted mb-0">
                    <li className="mb-1">• Sign transactions and proposals directly on-chain</li>
                    <li className="mb-1">• Stay synced with treasury + folder permissions</li>
                    <li>• Works on desktop and MetaMask mobile browser</li>
                  </ul>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Login
