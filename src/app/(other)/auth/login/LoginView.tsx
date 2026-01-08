'use client'

import { Badge, Card, Col, Container, Row } from 'react-bootstrap'

import AuthLogo from '@/components/AuthLogo'
import LoginForm from './components/LoginForm'

const LoginView = () => {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary py-5">
      <Container className="py-4">
        <Row className="justify-content-center">
          <Col xl={4} lg={5} md={7} sm={9}>
            <div className="text-center mb-4">
              <AuthLogo className="mb-3" />
              <Badge bg="soft-primary" text="primary" className="mb-2">
                Secure Access
              </Badge>
              <h3 className="fw-semibold">Sign in to NYAX Admin</h3>
              <p className="text-muted mb-0">Verify ownership of your governance wallet to continue.</p>
            </div>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4">
                <LoginForm />
              </Card.Body>
            </Card>
            <p className="text-center text-muted mt-3 mb-0 fs-14">
              Wallet not ready? Ensure MetaMask is unlocked &amp; set to Sepolia.
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default LoginView
