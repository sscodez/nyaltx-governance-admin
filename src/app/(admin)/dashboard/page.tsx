'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Col, ProgressBar, Row, Spinner } from 'react-bootstrap'
import { ethers } from 'ethers'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageTitle from '@/components/PageTitle'
import { useNotificationContext } from '@/context/useNotificationContext'
import useDaoService from '@/hooks/useDaoService'
import type { FolderInfo, GovernanceStats, ProposalData } from '@/services/contracts'
import { NETWORK_CONFIG } from '@/services/contracts'

const formatNumber = (value: string | number, digits = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0'
  if (numeric >= 1_000_000_000) return `${(numeric / 1_000_000_000).toFixed(digits)}B`
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(digits)}M`
  if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(digits)}K`
  return numeric.toLocaleString()
}

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

const Dashboard = () => {
  const { daoService, loading } = useDaoService()
  const { showNotification } = useNotificationContext()

  const [govStats, setGovStats] = useState<GovernanceStats | null>(null)
  const [recentProposals, setRecentProposals] = useState<ProposalData[]>([])
  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [blockTimestamps, setBlockTimestamps] = useState<Record<number, number>>({})
  const [fetching, setFetching] = useState(false)

  const loadDashboard = useCallback(async () => {
    if (!daoService) return
    setFetching(true)
    try {
      const [statsResponse, proposalsResponse, foldersResponse] = await Promise.all([
        daoService.governance.getGovernanceStats(),
        daoService.governance.getAllProposals(5),
        daoService.folders.getAllFolders(),
      ])
      setGovStats(statsResponse)
      setRecentProposals(proposalsResponse)
      setFolders(foldersResponse)
    } catch (error: any) {
      showNotification({ message: error?.message || 'Unable to load dashboard insights', variant: 'danger' })
    } finally {
      setFetching(false)
    }
  }, [daoService, showNotification])

  useEffect(() => {
    if (!daoService) return
    loadDashboard()
  }, [daoService, loadDashboard])

  const blockProvider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl)
    } catch {
      return null
    }
  }, [])

  const fetchBlockTimestamps = useCallback(
    async (blockNumbers: number[]) => {
      if (!blockProvider || !blockNumbers.length) return
      const uniqueBlocks = Array.from(new Set(blockNumbers)).filter(
        (block) => typeof block === 'number' && block >= 0 && blockTimestamps[block] === undefined,
      )
      if (!uniqueBlocks.length) return

      try {
        const entries = await Promise.all(
          uniqueBlocks.map(async (blockNumber) => {
            try {
              const block = await blockProvider.getBlock(blockNumber)
              return [blockNumber, Number(block?.timestamp ?? 0)] as const
            } catch {
              return [blockNumber, 0] as const
            }
          }),
        )
        setBlockTimestamps((prev) => {
          const next = { ...prev }
          entries.forEach(([blockNumber, timestamp]) => {
            if (timestamp) {
              next[blockNumber] = timestamp
            }
          })
          return next
        })
      } catch (error) {
        console.error('Failed to fetch block timestamps', error)
      }
    },
    [blockProvider, blockTimestamps],
  )

  useEffect(() => {
    if (!recentProposals.length) return
    const blockNumbers: number[] = []
    recentProposals.forEach((proposal) => {
      blockNumbers.push(proposal.startBlock, proposal.endBlock)
    })
    fetchBlockTimestamps(blockNumbers)
  }, [fetchBlockTimestamps, recentProposals])

  const formatBlockTimestamp = useCallback(
    (blockNumber: number) => {
      const timestamp = blockTimestamps[blockNumber]
      if (!timestamp) return `Block ${blockNumber}`
      return new Date(timestamp * 1000).toLocaleString()
    },
    [blockTimestamps],
  )

  const folderInsights = useMemo(() => {
    if (!folders.length) {
      return {
        total: 0,
        totalAllocated: 0,
        walletCount: 0,
        lockedCount: 0,
        topFolders: [] as FolderInfo[],
      }
    }

    const totalAllocated = folders.reduce((acc, folder) => acc + Number(folder.totalAllocated || 0), 0)
    const walletCount = folders.reduce((acc, folder) => acc + folder.members.length, 0)
    const lockedCount = folders.filter((folder) => folder.locked).length
    const topFolders = [...folders]
      .sort((a, b) => Number(b.totalAllocated) - Number(a.totalAllocated))
      .slice(0, 3)

    return {
      total: folders.length,
      totalAllocated,
      walletCount,
      lockedCount,
      topFolders,
    }
  }, [folders])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    recentProposals.forEach((proposal) => {
      counts[proposal.status] = (counts[proposal.status] || 0) + 1
    })
    return counts
  }, [recentProposals])

  return (
    <>
      <PageTitle title="Protocol Overview" />

      {(loading || fetching) && (
        <div className="d-flex align-items-center mb-3">
          <Spinner animation="border" size="sm" className="me-2" /> Syncing governance insights…
        </div>
      )}

      {!daoService && (
        <Alert variant="warning">Connect your governance wallet to see live folder and proposal metrics.</Alert>
      )}

      <Row className="g-3 mb-4">
        <Col xl={3} md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <p className="text-muted text-uppercase fs-12 mb-1">Total Folders</p>
              <h3 className="mb-1">{folderInsights.total}</h3>
              <ProgressBar
                now={folderInsights.total ? ((folderInsights.total - folderInsights.lockedCount) / folderInsights.total) * 100 : 0}
                variant="success"
                className="progress-sm rounded-pill bg-light"
              />
              <small className="text-muted d-block mt-2">
                {folderInsights.total - folderInsights.lockedCount} active · {folderInsights.lockedCount} locked
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <p className="text-muted text-uppercase fs-12 mb-1">NYAX Allocated</p>
              <h3 className="mb-1">{formatNumber(folderInsights.totalAllocated)} NYAX</h3>
              <small className="text-muted">Across {folderInsights.walletCount} wallets</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <p className="text-muted text-uppercase fs-12 mb-1">Active Proposals</p>
              <h3 className="mb-1">{govStats?.activeProposals ?? '—'}</h3>
              <small className="text-muted">{govStats?.totalProposals ?? '—'} total proposals</small>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={3} md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <p className="text-muted text-uppercase fs-12 mb-1">Quorum</p>
              <h3 className="mb-1">{formatNumber(govStats?.quorumVotes ?? 0)} votes</h3>
              <small className="text-muted">Threshold: {formatNumber(govStats?.proposalThreshold ?? 0)} votes</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xl={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Recent Proposals</h5>
                <small className="text-muted">
                  {Object.entries(statusCounts)
                    .map(([status, count]) => `${status} (${count})`)
                    .join(', ') || 'No activity yet'}
                </small>
              </div>
              <Button size="sm" variant="soft-primary" href="/governance/proposals">
                View all
              </Button>
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              {recentProposals.length === 0 && <p className="text-muted mb-0">No proposals found.</p>}
              {recentProposals.map((proposal) => (
                <div key={proposal.id} className="border rounded-3 p-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="flex-grow-1">
                      <p className="text-muted fs-12 mb-1">#{shortenId(proposal.id)}</p>
                      <h6 className="mb-1 text-truncate">{proposal.title || 'Untitled proposal'}</h6>
                      <p className="text-muted mb-2 small text-truncate">{proposal.description || 'No description provided'}</p>
                    </div>
                    <Badge bg="soft-primary" text="primary" className="text-uppercase">
                      {proposal.status}
                    </Badge>
                  </div>
                  <div className="d-flex gap-3 small text-muted">
                    <span className="text-success">For: {proposal.forVotes}</span>
                    <span className="text-danger">Against: {proposal.againstVotes}</span>
                    <span>Abstain: {proposal.abstainVotes}</span>
                  </div>
                  <div className="mt-2 small text-muted">
                    <div>Start: {formatBlockTimestamp(proposal.startBlock)}</div>
                    <div>End: {formatBlockTimestamp(proposal.endBlock)}</div>
                  </div>
                  <div className="mt-3 d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Proposer: {truncateAddress(proposal.proposer)}</span>
                    <Button size="sm" variant="soft-secondary" href="/governance/proposals">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Folder Insights</h5>
                <small className="text-muted">{folderInsights.total} managed cohorts</small>
              </div>
              <Button size="sm" variant="soft-success" href="/governance/folders">
                Manage folders
              </Button>
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-3">
              {folderInsights.topFolders.length === 0 && <p className="text-muted mb-0">No folders available.</p>}
              {folderInsights.topFolders.map((folder) => {
                const allocated = Number(folder.totalAllocated || 0)
                const progress = allocated ? Math.min(100, (folder.members.length / (folder.members.length || 1)) * 100) : 0
                return (
                  <div key={folder.id} className="border rounded-3 p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="flex-grow-1">
                        <p className="text-muted fs-12 mb-1">Folder #{folder.id}</p>
                        <h6 className="mb-1">{folder.name}</h6>
                        <div className="d-flex gap-3 small text-muted flex-wrap">
                          <span>Allocated: {formatNumber(allocated)} NYAX</span>
                          <span>Wallets: {folder.members.length}</span>
                          <span>
                            Status:{' '}
                            <Badge bg={folder.locked ? 'soft-danger' : 'soft-success'} text={folder.locked ? 'danger' : 'success'}>
                              {folder.locked ? 'Locked' : 'Live'}
                            </Badge>
                          </span>
                        </div>
                      </div>
                    </div>
                    <ProgressBar now={progress} variant="info" className="rounded-pill mt-2" />
                  </div>
                )
              })}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default Dashboard
