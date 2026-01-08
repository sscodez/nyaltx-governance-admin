'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'
import { ethers } from 'ethers'

import PageTitle from '@/components/PageTitle'
import { useNotificationContext } from '@/context/useNotificationContext'
import useDaoService from '@/hooks/useDaoService'
import type { GovernanceStats, ProposalData } from '@/services/contracts'

const defaultProposalForm = {
  title: '',
  description: '',
}

const statusVariantMap: Record<ProposalData['status'], { bg: string; text: string }> = {
  active: { bg: 'soft-primary', text: 'primary' },
  succeeded: { bg: 'soft-success', text: 'success' },
  defeated: { bg: 'soft-danger', text: 'danger' },
  queued: { bg: 'soft-warning', text: 'warning' },
  executed: { bg: 'soft-info', text: 'info' },
  canceled: { bg: 'soft-secondary', text: 'secondary' },
}

type ProposalAction = {
  target: string
  value: string
  calldata: string
}

const emptyAction: ProposalAction = {
  target: '',
  value: '0',
  calldata: '0x',
}

const ProposalsPage = () => {
  const { daoService, loading: serviceLoading, error: serviceError } = useDaoService()
  const { showNotification } = useNotificationContext()

  const [stats, setStats] = useState<GovernanceStats | null>(null)
  const [proposals, setProposals] = useState<ProposalData[]>([])
  const [fetching, setFetching] = useState(false)

  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState(defaultProposalForm)
  const [submitting, setSubmitting] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null)
  const [actions, setActions] = useState<ProposalAction[]>([emptyAction])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!daoService) return
    const load = async () => {
      setFetching(true)
      try {
        const [statsResponse, proposalsResponse] = await Promise.all([
          daoService.governance.getGovernanceStats(),
          daoService.governance.getAllProposals(),
        ])
        setStats(statsResponse)
        setProposals(proposalsResponse)
        setFetchError(null)
      } catch (err: any) {
        const message = err?.message || 'Unable to fetch proposals'
        setFetchError(message)
        showNotification({ message, variant: 'danger' })
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [daoService, showNotification])

  const refresh = async () => {
    if (!daoService) return
    setFetching(true)
    try {
      const [statsResponse, proposalsResponse] = await Promise.all([
        daoService.governance.getGovernanceStats(),
        daoService.governance.getAllProposals(),
      ])
      setStats(statsResponse)
      setProposals(proposalsResponse)
      setFetchError(null)
    } catch (err: any) {
      showNotification({ message: err?.message || 'Unable to refresh proposals', variant: 'danger' })
    } finally {
      setFetching(false)
    }
  }

  const openDetail = (proposal: ProposalData) => {
    setSelectedProposal(proposal)
    setDetailModal(true)
  }

  const handleCreateProposal = async () => {
    if (!daoService) return
    if (!actions.length) {
      showNotification({ message: 'Add at least one proposal action', variant: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const normalizedActions = actions.map((action) => {
        const target = action.target.trim() || '0x0000000000000000000000000000000000000000'
        const valueInput = action.value.trim()
        const weiValue = valueInput.length === 0 ? '0' : ethers.parseEther(valueInput || '0').toString()
        const calldata = action.calldata.trim().startsWith('0x') ? action.calldata.trim() : `0x${action.calldata.trim()}`
        return { target, value: weiValue, calldata }
      })
      const targets = normalizedActions.map((item) => item.target)
      const values = normalizedActions.map((item) => item.value)
      const calldatas = normalizedActions.map((item) => item.calldata)
      const description = `${createForm.title}\n${createForm.description}`
      await daoService.governance.createProposal(targets, values, calldatas, description)
      showNotification({ message: 'Proposal submitted. It will appear once mined.', variant: 'success' })
      setCreateModal(false)
      setCreateForm(defaultProposalForm)
      setActions([emptyAction])
      refresh()
    } catch (err: any) {
      showNotification({ message: err?.message || 'Unable to create proposal (connect wallet?)', variant: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    proposals.forEach((proposal) => {
      counts[proposal.status] = (counts[proposal.status] || 0) + 1
    })
    return counts
  }, [proposals])

  const updateAction = (index: number, patch: Partial<ProposalAction>) => {
    setActions((prev) => prev.map((action, idx) => (idx === index ? { ...action, ...patch } : action)))
  }

  const addAction = () => setActions((prev) => [...prev, emptyAction])
  const removeAction = (index: number) => {
    setActions((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)))
  }

  return (
    <>
      <PageTitle title="Proposals" />

      {(serviceError || !daoService) && (
        <Alert variant="warning">
          {serviceError || 'Connect your wallet to interact with governance contracts.'}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6 className="text-muted text-uppercase fs-12">Total proposals</h6>
              <h3 className="mb-0">{stats?.totalProposals ?? '--'}</h3>
              <small className="text-muted">Active: {stats?.activeProposals ?? '--'}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6 className="text-muted text-uppercase fs-12">Quorum Votes</h6>
              <h3 className="mb-0">{stats?.quorumVotes ?? '--'} NYAX</h3>
              <small className="text-muted">Threshold: {stats?.proposalThreshold ?? '--'} NYAX</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6 className="text-muted text-uppercase fs-12">Voting Window</h6>
              <h3 className="mb-0">{stats ? `${stats.votingPeriod} blocks` : '--'}</h3>
              <small className="text-muted">Delay: {stats ? `${stats.votingDelay} blocks` : '--'}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">Governance Proposals</h4>
                <p className="text-muted mb-0">Create, review, and track protocol proposals.</p>
              </div>
              <div className="d-flex gap-2">
                <Button variant="soft-secondary" onClick={refresh} disabled={fetching || serviceLoading}>
                  {fetching ? 'Refreshing…' : 'Refresh'}
                </Button>
                <Button variant="primary" onClick={() => setCreateModal(true)} disabled={!daoService}>
                  New Proposal
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">All Proposals</h5>
                <small className="text-muted">Statuses: {Object.entries(statusCounts).map(([status, count]) => `${status} (${count})`).join(', ') || '—'}</small>
              </div>
              {(fetching || serviceLoading) && <Spinner animation="border" size="sm" />}
            </Card.Header>
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Votes</th>
                    <th>Proposer</th>
                    <th>Start</th>
                    <th>End</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        {fetching ? 'Loading proposals…' : 'No proposals yet'}
                      </td>
                    </tr>
                  )}
                  {proposals.map((proposal) => {
                    const badge = statusVariantMap[proposal.status]
                    return (
                      <tr key={proposal.id}>
                        <td>#{proposal.id}</td>
                        <td className="fw-semibold text-truncate" style={{ maxWidth: 200 }}>
                          {proposal.title}
                        </td>
                        <td>
                          <Badge bg={badge.bg} text={badge.text} className="text-uppercase">
                            {proposal.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="text-success">For: {proposal.forVotes}</span>
                            <span className="text-danger">Against: {proposal.againstVotes}</span>
                            <span className="text-muted">Abstain: {proposal.abstainVotes}</span>
                          </div>
                        </td>
                        <td className="text-muted text-truncate" style={{ maxWidth: 160 }}>
                          {proposal.proposer}
                        </td>
                        <td>{proposal.startBlock}</td>
                        <td>{proposal.endBlock}</td>
                        <td className="text-end">
                          <Button size="sm" variant="soft-primary" onClick={() => openDetail(proposal)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal show={createModal} onHide={() => setCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Proposal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Upgrade treasury timelock"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0 text-uppercase fs-12 text-muted">Actions</h6>
              <Button size="sm" variant="soft-primary" onClick={addAction}>
                Add action
              </Button>
            </div>
            {actions.map((action, index) => (
              <Card className="mb-3" key={`action-${index}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Action #{index + 1}</h6>
                    {actions.length > 1 && (
                      <Button size="sm" variant="soft-danger" onClick={() => removeAction(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <Form.Group className="mb-3">
                    <Form.Label>Target Address</Form.Label>
                    <Form.Control
                      value={action.target}
                      onChange={(e) => updateAction(index, { target: e.target.value })}
                      placeholder="0x..."
                    />
                  </Form.Group>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>ETH Value</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        step="0.001"
                        value={action.value}
                        onChange={(e) => updateAction(index, { value: e.target.value })}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Label>Calldata</Form.Label>
                      <Form.Control
                        value={action.calldata}
                        onChange={(e) => updateAction(index, { calldata: e.target.value })}
                        placeholder="0x"
                      />
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="soft-secondary" onClick={() => setCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateProposal} disabled={!createForm.title.trim() || submitting}>
            {submitting ? 'Submitting…' : 'Submit Proposal'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={detailModal} onHide={() => setDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Proposal Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProposal && (
            <>
              <h4 className="mb-1">{selectedProposal.title}</h4>
              <p className="text-muted">{selectedProposal.description}</p>
              <Row className="mb-3">
                <Col md={4}>
                  <h6 className="text-muted text-uppercase fs-12">Status</h6>
                  <Badge bg={statusVariantMap[selectedProposal.status].bg} text={statusVariantMap[selectedProposal.status].text}>
                    {selectedProposal.status}
                  </Badge>
                </Col>
                <Col md={4}>
                  <h6 className="text-muted text-uppercase fs-12">Votes</h6>
                  <div className="d-flex flex-column">
                    <span className="text-success">For: {selectedProposal.forVotes}</span>
                    <span className="text-danger">Against: {selectedProposal.againstVotes}</span>
                    <span className="text-muted">Abstain: {selectedProposal.abstainVotes}</span>
                  </div>
                </Col>
                <Col md={4}>
                  <h6 className="text-muted text-uppercase fs-12">Blocks</h6>
                  <p className="mb-0">Start: {selectedProposal.startBlock}</p>
                  <p className="mb-0">End: {selectedProposal.endBlock}</p>
                </Col>
              </Row>
              <Card className="mb-3">
                <Card.Body>
                  <h6 className="text-uppercase text-muted fs-12">Targets & Payload</h6>
                  {selectedProposal.targets.map((target, index) => (
                    <div key={target + index} className="mb-3">
                      <div className="text-muted text-uppercase fs-12">Target {index + 1}</div>
                      <p className="mb-1 text-break">{target}</p>
                      <div className="text-muted text-uppercase fs-12">Call Data</div>
                      <p className="mb-1 text-break">{selectedProposal.calldatas[index]}</p>
                      <div className="text-muted text-uppercase fs-12">Value</div>
                      <p className="text-break">{selectedProposal.values[index]}</p>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default ProposalsPage
