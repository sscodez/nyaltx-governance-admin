  'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Modal, ProgressBar, Row, Spinner } from 'react-bootstrap'
import { ethers } from 'ethers'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageTitle from '@/components/PageTitle'
import { useNotificationContext } from '@/context/useNotificationContext'
import useDaoService from '@/hooks/useDaoService'
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from '@/services/contracts'
import type { GovernanceStats, ProposalData } from '@/services/contracts'

const defaultProposalForm = {
  title: '',
  description: '',
}

const statusVariantMap: Record<ProposalData['status'], { bg: string; text: string; icon: string; label: string }> = {
  active: { bg: 'soft-primary', text: 'primary', icon: 'solar:flash-bold-duotone', label: 'Active' },
  succeeded: { bg: 'soft-success', text: 'success', icon: 'solar:check-ring-round-bold-duotone', label: 'Succeeded' },
  defeated: { bg: 'soft-danger', text: 'danger', icon: 'solar:close-circle-line-duotone', label: 'Defeated' },
  queued: { bg: 'soft-warning', text: 'warning', icon: 'solar:calendar-line-duotone', label: 'Queued' },
  executed: { bg: 'soft-info', text: 'info', icon: 'solar:rocket-bold-duotone', label: 'Executed' },
  canceled: { bg: 'soft-secondary', text: 'secondary', icon: 'solar:shield-cross-bold-duotone', label: 'Canceled' },
}
const STATUS_ORDER: ProposalData['status'][] = ['active', 'succeeded', 'queued', 'executed', 'defeated', 'canceled']

type ProposalAction = {
  target: string
  value: string
  calldata: string
}

type PresetField = {
  name: string
  label: string
  placeholder?: string
  type?: 'text' | 'number'
  helper?: string
}

type ActionPreset = {
  key: string
  label: string
  description?: string
  fields?: PresetField[]
  encode: (params: Record<string, string>, iface: ethers.Interface) => { target: string; value: string; calldata: string }
}

function ensureAddress(value: string | undefined, label: string) {
  const trimmed = value?.trim()
  if (!trimmed || !ethers.isAddress(trimmed)) {
    throw new Error(`Enter a valid ${label}.`)
  }
  return trimmed
}

function parseTokenAmount(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error('Amount is required.')
  }
  try {
    return ethers.parseUnits(trimmed, 18)
  } catch {
    throw new Error('Enter a valid numeric amount.')
  }
}

const ACTION_PRESETS: ActionPreset[] = [
  {
    key: 'enableTransfers',
    label: 'NYAX: Enable transfers',
    description: 'setTransfersEnabled(true)',
    encode: (_params, iface) => ({
      target: CONTRACT_ADDRESSES.nyaxToken ?? ethers.ZeroAddress,
      value: '0',
      calldata: iface.encodeFunctionData('setTransfersEnabled', [true]),
    }),
  },
  {
    key: 'disableTransfers',
    label: 'NYAX: Disable transfers',
    description: 'setTransfersEnabled(false)',
    encode: (_params, iface) => ({
      target: CONTRACT_ADDRESSES.nyaxToken ?? ethers.ZeroAddress,
      value: '0',
      calldata: iface.encodeFunctionData('setTransfersEnabled', [false]),
    }),
  },
  {
    key: 'transferTokens',
    label: 'NYAX: Transfer tokens',
    description: 'transfer(address to, uint256 amount)',
    fields: [
      { name: 'recipient', label: 'Recipient address', placeholder: '0xabc...' },
      { name: 'amount', label: 'Amount (NYAX)', placeholder: '1000' },
    ],
    encode: (params, iface) => ({
      target: CONTRACT_ADDRESSES.nyaxToken ?? ethers.ZeroAddress,
      value: '0',
      calldata: iface.encodeFunctionData('transfer', [
        ensureAddress(params.recipient, 'recipient address'),
        parseTokenAmount(params.amount),
      ]),
    }),
  },
  {
    key: 'mintTokens',
    label: 'NYAX: Mint tokens',
    description: 'mint(address to, uint256 amount)',
    fields: [
      { name: 'recipient', label: 'Recipient address', placeholder: '0xabc...' },
      { name: 'amount', label: 'Amount (NYAX)', placeholder: '5000' },
    ],
    encode: (params, iface) => ({
      target: CONTRACT_ADDRESSES.nyaxToken ?? ethers.ZeroAddress,
      value: '0',
      calldata: iface.encodeFunctionData('mint', [
        ensureAddress(params.recipient, 'recipient address'),
        parseTokenAmount(params.amount),
      ]),
    }),
  },
  {
    key: 'burnTokens',
    label: 'NYAX: Burn tokens',
    description: 'burn(address from, uint256 amount)',
    fields: [
      { name: 'holder', label: 'Holder address', placeholder: '0xabc...' },
      { name: 'amount', label: 'Amount (NYAX)', placeholder: '2500' },
    ],
    encode: (params, iface) => ({
      target: CONTRACT_ADDRESSES.nyaxToken ?? ethers.ZeroAddress,
      value: '0',
      calldata: iface.encodeFunctionData('burn', [
        ensureAddress(params.holder, 'holder address'),
        parseTokenAmount(params.amount),
      ]),
    }),
  },
  {
    key: 'burnSelf',
    label: 'NYAX: Burn treasury balance',
    description: 'burnSelf(uint256 amount)',
    fields: [{ name: 'amount', label: 'Amount (NYAX)', placeholder: '750' }],
    encode: (params, iface) => ({
      target: CONTRACT_ADDRESSES.nyaxToken ?? ethers.ZeroAddress,
      value: '0',
      calldata: iface.encodeFunctionData('burnSelf', [parseTokenAmount(params.amount)]),
    }),
  },
]

type ProposalActionState = ProposalAction & {
  presetKey?: string
  presetInputs?: Record<string, string>
}

const emptyAction: ProposalActionState = {
  target: '',
  value: '0',
  calldata: '0x',
  presetKey: undefined,
  presetInputs: undefined,
}

const getPresetByKey = (key?: string) => (key ? ACTION_PRESETS.find((preset) => preset.key === key) : undefined)

const shortenId = (id: string) => {
  if (!id) return '—'
  const trimmed = id.replace(/^0+/, '')
  if (trimmed.length <= 10) return trimmed
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`
}

const truncateAddress = (address?: string) => {
  if (!address) return '—'
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

const formatVotes = (value: string) => {
  if (!value) return '0'
  return Number(value).toLocaleString()
}

const getVoteBreakdown = (proposal: ProposalData) => {
  const forVotes = Number(proposal.forVotes || 0)
  const againstVotes = Number(proposal.againstVotes || 0)
  const abstainVotes = Number(proposal.abstainVotes || 0)
  const total = forVotes + againstVotes + abstainVotes || 1

  return {
    forVotes,
    againstVotes,
    abstainVotes,
    forPct: (forVotes / total) * 100,
    againstPct: (againstVotes / total) * 100,
    abstainPct: (abstainVotes / total) * 100,
  }
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
  const [actions, setActions] = useState<ProposalActionState[]>([emptyAction])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [proposalAlert, setProposalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const nyaxTokenInterface = useMemo(() => {
    try {
      return CONTRACT_ABIS.nyaxToken ? new ethers.Interface(CONTRACT_ABIS.nyaxToken) : null
    } catch (error) {
      console.error('Failed to initialise NYAX token interface', error)
      return null
    }
  }, [])

  const resolveActionPayload = (action: ProposalActionState) => {
    if (action.presetKey) {
      const preset = getPresetByKey(action.presetKey)
      if (!preset) {
        throw new Error('Unknown preset selected. Please reselect.')
      }
      if (!nyaxTokenInterface) {
        throw new Error('Token ABI unavailable. Check contract config.')
      }

      const params: Record<string, string> = {}
      preset.fields?.forEach((field) => {
        const value = action.presetInputs?.[field.name]
        if (!value?.trim()) {
          throw new Error(`${field.label} is required for preset actions.`)
        }
        params[field.name] = value
      })

      return preset.encode(params, nyaxTokenInterface)
    }

    const target = action.target.trim() || ethers.ZeroAddress
    let weiValue = '0'
    if (action.value.trim().length) {
      try {
        weiValue = ethers.parseEther(action.value.trim()).toString()
      } catch {
        throw new Error('Enter a valid ETH value (use decimals).')
      }
    }
    const calldata = action.calldata.trim().startsWith('0x')
      ? action.calldata.trim()
      : `0x${action.calldata.trim()}`

    if (calldata === '0x') {
      throw new Error('Calldata is required (prepend 0x).')
    }

    return { target, value: weiValue, calldata }
  }

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
      const normalizedActions = actions.map((action) => resolveActionPayload(action))
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
      const message = err?.message || 'Unable to create proposal (check form + wallet)'
      showNotification({ message, variant: 'danger' })
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

  const handlePresetSelect = (actionIdx: number, presetKey: string) => {
    const preset = getPresetByKey(presetKey)
    if (!preset) return

    setActions((prev) =>
      prev.map((action, idx) =>
        idx === actionIdx
          ? {
              ...action,
              presetKey,
              presetInputs: preset.fields?.reduce<Record<string, string>>((acc, field) => {
                acc[field.name] = action.presetInputs?.[field.name] ?? ''
                return acc
              }, {}) ?? {},
            }
          : action,
      ),
    )
    setProposalAlert({ type: 'success', message: `Using preset "${preset.label}" for action ${actionIdx + 1}` })
  }

  const clearPreset = (actionIdx: number) => {
    setActions((prev) =>
      prev.map((action, idx) =>
        idx === actionIdx
          ? {
              ...action,
              presetKey: undefined,
              presetInputs: undefined,
            }
          : action,
      ),
    )
  }

  const updatePresetInput = (actionIdx: number, fieldName: string, value: string) => {
    setActions((prev) =>
      prev.map((action, idx) =>
        idx === actionIdx
          ? {
              ...action,
              presetInputs: {
                ...(action.presetInputs ?? {}),
                [fieldName]: value,
              },
            }
          : action,
      ),
    )
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

      <Row className="g-3">
        {proposals.length === 0 && (
          <Col>
            <Card className="text-center border-0 shadow-sm py-5">
              <Card.Body>
                <IconifyIcon icon="solar:document-bold-duotone" className="display-5 text-muted mb-3" />
                <h5 className="mb-1">{fetching ? 'Loading proposals…' : 'No proposals yet'}</h5>
                <p className="text-muted mb-0">Kick off governance by submitting the first proposal.</p>
              </Card.Body>
            </Card>
          </Col>
        )}
        {proposals.map((proposal) => {
          const badge = statusVariantMap[proposal.status]
          const votes = getVoteBreakdown(proposal)
          return (
            <Col xs={12} key={proposal.id}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="flex-grow-1">
                      <p className="text-muted fs-12 mb-1">Proposal #{shortenId(proposal.id)}</p>
                      <h5 className="mb-1 text-truncate">{proposal.title || 'Untitled proposal'}</h5>
                      <p className="text-muted mb-0 small text-truncate">
                        {proposal.description || 'No description provided.'}
                      </p>
                    </div>
                    <Badge bg={badge.bg} text={badge.text} className="text-uppercase">
                      {proposal.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="d-flex justify-content-between small text-muted">
                      <span>Voting distribution</span>
                      <span>Total: {formatVotes((votes.forVotes + votes.againstVotes + votes.abstainVotes).toString())}</span>
                    </div>
                    <ProgressBar className="mt-1 rounded-pill" style={{ height: 10 }}>
                      <ProgressBar now={votes.forPct} variant="success" key="for" />
                      <ProgressBar now={votes.againstPct} variant="danger" key="against" />
                      <ProgressBar now={votes.abstainPct} variant="secondary" key="abstain" />
                    </ProgressBar>
                    <div className="d-flex justify-content-between mt-2 small">
                      <span className="text-success">For: {formatVotes(proposal.forVotes)} </span>
                      <span className="text-danger">Against: {formatVotes(proposal.againstVotes)}</span>
                      <span className="text-muted">Abstain: {formatVotes(proposal.abstainVotes)}</span>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-3 text-muted small">
                    <div>
                      <div className="text-uppercase fs-11">Proposer</div>
                      <span className="text-dark fw-semibold">{truncateAddress(proposal.proposer)}</span>
                    </div>
                    <div>
                      <div className="text-uppercase fs-11">Start / End</div>
                      <span className="text-dark fw-semibold">
                        {proposal.startBlock} → {proposal.endBlock}
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    <div className="text-muted small">
                      Updated status counts:{' '}
                      {Object.entries(statusCounts)
                        .map(([status, count]) => `${status} (${count})`)
                        .join(', ') || '—'}
                    </div>
                    <Button size="sm" variant="soft-primary" onClick={() => openDetail(proposal)}>
                      View
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )
        })}
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
                    <Form.Label className="text-muted">Quick presets</Form.Label>
                    <Form.Select
                      defaultValue=""
                      onChange={(event) => {
                        const value = event.target.value
                        if (value) {
                          handlePresetSelect(index, value)
                          event.target.value = ''
                        }
                      }}
                    >
                      <option value="" disabled>
                        Select NYAX helper…
                      </option>
                      {ACTION_PRESETS.map((preset: ActionPreset) => (
                        <option value={preset.key} key={preset.key}>
                          {preset.label}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text muted>
                      Prefill target + calldata for common NYAX governor actions. Contract: {CONTRACT_ADDRESSES.nyaxToken || '—'}
                    </Form.Text>
                  </Form.Group>
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
