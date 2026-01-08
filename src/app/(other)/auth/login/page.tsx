import type { Metadata } from 'next'
import Image from 'next/image'
import { Card, Col, Container, Row } from 'react-bootstrap'

import AuthLogo from '@/components/AuthLogo'
import LoginForm from './components/LoginForm'

import authImg from '@/assets/images/auth-img.jpg'

export const metadata: Metadata = { title: 'Connect Wallet' }

const Login = () => {
  return (
    <div className="account-pages p-sm-5 position-relative">
      <Container>
        <Row className="justify-content-center">
          <Col xxl={9} lg={11}>
            <Card className="overflow-hidden">
              <Row className="g-0">
                <Col lg={6}>
                  <div className="d-flex flex-column h-100">
                    <AuthLogo />
                    <div className="p-4 my-auto text-center">
                      <h4 className="fs-20 mb-2">Connect your wallet</h4>
                      <p className="text-muted mb-4">
                        Governance access is now protected with MetaMask. Connect your wallet to continue to the dashboard.
                      </p>
                      <LoginForm />
                    </div>
                  </div>
                </Col>
               
              </Row>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Login
