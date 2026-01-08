'use client'

import { Card, Col, Container, Row } from 'react-bootstrap'

import AuthLogo from '@/components/AuthLogo'
import LoginForm from './components/LoginForm'

const LoginView = () => {
  return (
    <div className="account-pages p-sm-5 position-relative">
      <Container>
        <Row className="justify-content-center">
          <Col xxl={7} lg={8}>
            <Card className="border-0 shadow-lg">
              <Card.Body className="p-4 p-md-5">
              
                <div className="text-center">
                  <h4 className="fw-semibold mb-2">Connect your wallet</h4>
              
                </div> 
                <LoginForm />
             
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default LoginView
