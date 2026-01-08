'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Form, Modal, Offcanvas, ProgressBar, Row, Spinner, Table } from 'react-bootstrap'
import { ethers } from 'ethers'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import PageTitle from '@/components/PageTitle'
import { useNotificationContext } from '@/context/useNotificationContext'
import useDaoService from '@/hooks/useDaoService'
import type { FolderInfo, FolderMemberInfo } from '@/services/contracts'

const DAY_IN_SECONDS = 86400

const defaultTemplate = {
  permissions: 1,
  name: '',
  cliffDays: 0,
  durationDays: 365,
  revocable: true,
}

const defaultAllocation = {
  folderId: '',
  account: '',
  amount: '',
  startDate: '',
  cliffDays: 0,
  durationDays: 365,
  permissions: 1,
}

const formatNumber = (value: string | number) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0'
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1)}M`
  if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(1)}K`
  return numeric.toLocaleString()
}

const ZERO_ADDRESS = ethers.ZeroAddress

type TreasuryOverview = {
  treasuryBalance: string
  totalFolders: number
  approvedFolders: number
  isPaused: boolean
}

type FolderCard = FolderInfo & {
  folderAddress: string
  walletCount: number
  claimable: number
  progressPct: number
  isApproved: boolean
}

const truncateAddress = (address?: string) => {
  if (!address || address === ZERO_ADDRESS) return '—'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const FolderRegistryPage = () => {
  const { daoService, loading, error } = useDaoService()
  const { showNotification } = useNotificationContext()

  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [folderCards, setFolderCards] = useState<FolderCard[]>([])
  const [folderAddressMap, setFolderAddressMap] = useState<Record<string, string>>({})
  const [treasuryStats, setTreasuryStats] = useState<TreasuryOverview | null>(null)
  const [fetching, setFetching] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<FolderInfo | null>(null)
  const [members, setMembers] = useState<FolderMemberInfo[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFolder, setNewFolder] = useState(defaultTemplate)

  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [allocation, setAllocation] = useState(defaultAllocation)

  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  const [fundModal, setFundModal] = useState<{ show: boolean; folder: FolderCard | null; amount: string }>({
    show: false,
    folder: null,
    amount: '',
  })
  const [approveModal, setApproveModal] = useState<{ show: boolean; folder: FolderCard | null }>({
    show: false,
    folder: null,
  })
  const [funding, setFunding] = useState(false)
  const [approving, setApproving] = useState(false)

  const fetchFolderAddresses = useCallback(
    async (foldersList: FolderInfo[]) => {
      if (!daoService?.folderFactory) return {}
      try {
        const addresses = await daoService.folderFactory.getAllFolders()
        const entries = await Promise.all(
          addresses.map(async (address: string) => {
            try {
              const info = await daoService.folderFactory.getFolderInfo(address)
              if (!info?.name) return null
              return [info.name, address] as const
            } catch {
              return null
            }
          }),
        )
        const map = entries.filter(Boolean).reduce<Record<string, string>>((acc, entry) => {
          if (entry) acc[entry[0]] = entry[1]
          return acc
        }, {})
        // fallback: ensure currently known folders have at least zero address entry
        foldersList.forEach((folder) => {
          if (!map[folder.name]) map[folder.name] = ZERO_ADDRESS
        })
        setFolderAddressMap(map)
        return map
      } catch {
        return foldersList.reduce<Record<string, string>>((acc, folder) => {
          acc[folder.name] = ZERO_ADDRESS
          return acc
        }, {})
      }
    },
    [daoService?.folderFactory],
  )

  const hydrateFolderCards = useCallback(
    async (baseFolders: FolderInfo[], addressMap: Record<string, string>) => {
      if (!daoService) return
      try {
        const approvedList = await daoService.treasury
          .getApprovedFolders()
          .catch(() => []) as { address: string }[]
        const approvedSet = new Set(approvedList.map((item) => item.address?.toLowerCase?.()).filter(Boolean))

        const cards = await Promise.all(
          baseFolders.map(async (folder) => {
            let walletCount = folder.members.length
            let claimable = 0
            try {
              const detail = await daoService.folders.getFolderMembers(folder.id)
              walletCount = detail.length
              claimable = detail.reduce((sum, member) => sum + Number(member.unlockedAmount || 0), 0)
            } catch {
              // ignore per-folder failures
            }

            const totalAllocated = Number(folder.totalAllocated) || 0
            const progressPct = totalAllocated > 0 ? Math.min(100, (claimable / totalAllocated) * 100) : 0
            const folderAddress = addressMap[folder.name] ?? ZERO_ADDRESS
            const isApproved =
              folderAddress !== ZERO_ADDRESS && approvedSet.has(folderAddress.toLowerCase())

            return {
              ...folder,
              folderAddress,
              walletCount,
              claimable,
              progressPct,
              isApproved,
            }
          }),
        )

        setFolderCards(cards)
      } catch (err: any) {
        console.error('Failed to hydrate folder cards', err)
      }
    },
    [daoService],
  )

  const loadData = useCallback(async () => {
    if (!daoService) return
    setFetching(true)
    try {
      const [list, treasury] = await Promise.all([
        daoService.folders.getAllFolders(),
        daoService.treasury
          .getTreasuryStats()
          .then((stats) => ({
            treasuryBalance: stats.treasuryBalance,
            totalFolders: stats.totalFolders,
            approvedFolders: stats.approvedFolders,
            isPaused: stats.isPaused,
          }))
          .catch(() => null),
      ])

      setFolders(list)
      setTreasuryStats(treasury)

      const addressMap = await fetchFolderAddresses(list)
      await hydrateFolderCards(list, addressMap)
    } catch (err: any) {
      showNotification({ message: err?.message || 'Failed to load folder registry', variant: 'danger' })
    } finally {
      setFetching(false)
    }
  }, [daoService, fetchFolderAddresses, hydrateFolderCards, showNotification])

  useEffect(() => {
    if (!daoService) return
    loadData()
  }, [daoService, loadData])

  const refreshFolders = async () => {
    await loadData()
  }

  const filteredFolders = useMemo(() => {
    if (!search.trim()) return folderCards
    const query = search.trim().toLowerCase()
    return folderCards.filter(
      (folder) => folder.name.toLowerCase().includes(query) || folder.id.toString().includes(query),
    )
  }, [folderCards, search])

  const summary = useMemo(() => {
    const totalMembers = folders.reduce((acc, folder) => acc + folder.members.length, 0)
    const totalAllocated = folders.reduce((acc, folder) => acc + Number(folder.totalAllocated), 0)
    const lockedCount = folders.filter((folder) => folder.locked).length

    return {
      totalFolders: folders.length,
      totalMembers,
      lockedCount,
      totalAllocated: formatNumber(totalAllocated),
    }
  }, [folders])

  const handleCreateFolder = async () => {
    if (!daoService) return
    try {
      await daoService.folders.createFolder(newFolder.name, Number(newFolder.permissions), {
        cliff: Number(newFolder.cliffDays) * DAY_IN_SECONDS,
        duration: Number(newFolder.durationDays) * DAY_IN_SECONDS,
        revocable: newFolder.revocable,
      })
      showNotification({ message: 'Folder created successfully', variant: 'success' })
      setShowCreateModal(false)
      setNewFolder(defaultTemplate)
      refreshFolders()
    } catch (err: any) {
      showNotification({ message: err?.message || 'Unable to create folder (connect wallet?)', variant: 'danger' })
    }
  }

  const handleAllocation = async () => {
    if (!daoService) return
    try {
      const folderId = Number(allocation.folderId)
      await daoService.folders.setAllocation(
        folderId,
        allocation.account,
        allocation.amount,
        {
          start: allocation.startDate ? Math.floor(new Date(allocation.startDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
          cliff: Number(allocation.cliffDays) * DAY_IN_SECONDS,
          duration: Number(allocation.durationDays) * DAY_IN_SECONDS,
          revocable: true,
        },
        Number(allocation.permissions) || 0,
      )
      showNotification({ message: 'Allocation saved successfully', variant: 'success' })
      setShowAllocationModal(false)
      setAllocation(defaultAllocation)
      refreshFolders()
    } catch (err: any) {
      showNotification({ message: err?.message || 'Unable to set allocation', variant: 'danger' })
    }
  }

  const openFolderDetail = async (folder: FolderInfo) => {
    if (!daoService) return
    setSelectedFolder(folder)
    setShowDetailDrawer(true)
    setMembersLoading(true)
    try {
      const detail = await daoService.folders.getFolderMembers(folder.id)
      setMembers(detail)
    } catch (err: any) {
      showNotification({ message: err?.message || 'Failed to fetch members', variant: 'danger' })
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const handleFundFolder = async () => {
    if (!daoService || !fundModal.folder || !fundModal.amount.trim()) return
    setFunding(true)
    try {
      const amountWei = ethers.parseEther(fundModal.amount)
      await daoService.treasury.sendToFolder(fundModal.folder.folderAddress, amountWei, daoService['signer'] as ethers.Signer)
      showNotification({ message: 'Funds sent to folder', variant: 'success' })
      setFundModal({ show: false, folder: null, amount: '' })
      refreshFolders()
    } catch (err: any) {
      showNotification({ message: err?.message || 'Unable to fund folder', variant: 'danger' })
    } finally {
      setFunding(false)
    }
  }

  const handleApproveFolder = async () => {
    if (!daoService || !approveModal.folder) return
    setApproving(true)
    try {
      await daoService.treasury.approveFolder(approveModal.folder.folderAddress, daoService['signer'] as ethers.Signer)
      showNotification({ message: 'Folder approved successfully', variant: 'success' })
      setApproveModal({ show: false, folder: null })
      refreshFolders()
    } catch (err: any) {
      showNotification({ message: err?.message || 'Unable to approve folder', variant: 'danger' })
    } finally {
      setApproving(false)
    }
  }

  return (
    <>
      <PageTitle title="Folder Registry" />

      <Row className="g-3 mb-3">
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm bg-primary-subtle text-primary">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase text-primary-emphasis fw-semibold fs-12 mb-1">Total Folders</p>
                  <h3 className="fw-bold mb-0">{summary.totalFolders}</h3>
                </div>
                <div className="avatar-sm bg-primary rounded-circle d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:folder-bold-duotone" className="fs-4 text-white" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm bg-success-subtle text-success">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase text-success-emphasis fw-semibold fs-12 mb-1">Active Wallets</p>
                  <h3 className="fw-bold mb-0">{summary.totalMembers}</h3>
                </div>
                <div className="avatar-sm bg-success rounded-circle d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:users-group-two-rounded-bold-duotone" className="fs-4 text-white" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm bg-warning-subtle text-warning">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase text-warning-emphasis fw-semibold fs-12 mb-1">Locked Folders</p>
                  <h3 className="fw-bold mb-0">{summary.lockedCount}</h3>
                </div>
                <div className="avatar-sm bg-warning rounded-circle d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:shield-warning-bold-duotone" className="fs-4 text-white" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6}>
          <Card className="border-0 shadow-sm bg-info-subtle text-info">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase text-info-emphasis fw-semibold fs-12 mb-1">Total Allocated (NYAX)</p>
                  <h3 className="fw-bold mb-0">{summary.totalAllocated}</h3>
                </div>
                <div className="avatar-sm bg-info rounded-circle d-flex align-items-center justify-content-center">
                  <IconifyIcon icon="solar:coins-stacked-bold-duotone" className="fs-4 text-white" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div>
            <h4 className="mb-1">Folders & Allocations</h4>
            <p className="text-muted mb-0">Curate NYAX distribution and member permissions per cohort.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Form.Control
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders…"
              className="w-auto"
            />
            <Button variant="soft-secondary" onClick={refreshFolders} disabled={fetching || loading}>
              {(fetching || loading) ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" /> Refreshing…
                </>
              ) : (
                <>
                  <IconifyIcon icon="solar:refresh-circle-bold-duotone" className="me-1" />
                  Refresh
                </>
              )}
            </Button>
            <Button variant="outline-primary" onClick={() => setShowAllocationModal(true)} disabled={!daoService}>
              <IconifyIcon icon="solar:user-plus-rounded-bold-duotone" className="me-1" />
              Add Wallet
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} disabled={!daoService}>
              <IconifyIcon icon="solar:add-folder-bold-duotone" className="me-1" />
              New Folder
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {filteredFolders.length === 0 ? (
          <Col>
            <Card className="border-0 shadow-sm text-center py-5">
              <Card.Body>
                <IconifyIcon icon="solar:folder-open-bold-duotone" className="display-5 text-muted mb-3" />
                <h5 className="mb-1">No folders match your filter</h5>
                <p className="text-muted mb-0">Create a folder or adjust the search query.</p>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          filteredFolders.map((folder) => {
            const progress = Math.min(100, Math.round(folder.progressPct))
            const claimableDisplay = formatNumber(folder.claimable)
            const allocatedDisplay = formatNumber(folder.totalAllocated)
            return (
              <Col xxl={6} lg={6} key={folder.id}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="flex-grow-1">
                        <p className="text-muted fs-12 mb-1">Folder #{folder.id}</p>
                        <h4 className="mb-0">{folder.name}</h4>
                        <div className="d-flex gap-2 flex-wrap mt-2">
                          <Badge bg="soft-info" text="info">
                            Wallets: {folder.walletCount}
                          </Badge>
                          <Badge bg="soft-secondary" text="secondary">Perm {folder.defaultPermissions}</Badge>
                          <Badge bg={folder.isApproved ? 'soft-success' : 'soft-warning'} text={folder.isApproved ? 'success' : 'warning'}>
                            {folder.isApproved ? 'Approved' : 'Pending approval'}
                          </Badge>
                        </div>
                      </div>
                      <Badge bg={folder.locked ? 'soft-danger' : 'soft-success'} text={folder.locked ? 'danger' : 'success'}>
                        {folder.locked ? 'Locked' : 'Live'}
                      </Badge>
                    </div>

                    <div className="d-flex flex-wrap gap-4">
                      <div>
                        <p className="text-muted mb-1">Allocated</p>
                        <h5 className="mb-0">{allocatedDisplay} NYAX</h5>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Claimable</p>
                        <h5 className="mb-0 text-success">{claimableDisplay} NYAX</h5>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between small text-muted">
                        <span>Vesting progress</span>
                        <span>{progress}%</span>
                      </div>
                      <ProgressBar className="rounded-pill mt-1" style={{ height: 12 }}>
                        <ProgressBar now={progress} variant="success" />
                      </ProgressBar>
                      <div className="d-flex justify-content-between mt-2 small text-muted">
                        <span>Unvested: {formatNumber(Math.max(0, Number(folder.totalAllocated) - folder.claimable))} NYAX</span>
                        <span>Wallets: {folder.walletCount}</span>
                      </div>
                    </div>

                    <div className="mt-auto d-flex flex-wrap gap-2">
                      <Button variant="soft-primary" className="flex-grow-1" onClick={() => openFolderDetail(folder)}>
                        View Insights
                      </Button>
                      <Button
                        variant="outline-success"
                        className="flex-grow-1"
                        disabled={!folder.folderAddress || folder.folderAddress === ZERO_ADDRESS}
                        onClick={() =>
                          setFundModal({
                            show: true,
                            folder,
                            amount: '',
                          })
                        }
                      >
                        Fund Folder
                      </Button>
                      {!folder.isApproved && (
                        <Button
                          variant="soft-warning"
                          className="flex-grow-1"
                          onClick={() =>
                            setApproveModal({
                              show: true,
                              folder,
                            })
                          }
                        >
                          Approve Folder
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            )
          })
        )}
      </Row>

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Folder name</Form.Label>
              <Form.Control
                value={newFolder.name}
                placeholder="Treasury Ops"
                onChange={(e) => setNewFolder((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Default permissions</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={newFolder.permissions}
                onChange={(e) => setNewFolder((prev) => ({ ...prev, permissions: Number(e.target.value) }))}
              />
            </Form.Group>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Cliff (days)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={newFolder.cliffDays}
                  onChange={(e) => setNewFolder((prev) => ({ ...prev, cliffDays: Number(e.target.value) }))}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Duration (days)</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={newFolder.durationDays}
                  onChange={(e) => setNewFolder((prev) => ({ ...prev, durationDays: Number(e.target.value) }))}
                />
              </Col>
            </Row>
            <Form.Check
              type="switch"
              id="folder-revocable"
              label="Revocable"
              checked={newFolder.revocable}
              onChange={(e) => setNewFolder((prev) => ({ ...prev, revocable: e.target.checked }))}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="soft-secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateFolder} disabled={!newFolder.name.trim()}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={fundModal.show} onHide={() => setFundModal({ show: false, folder: null, amount: '' })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Fund Folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!fundModal.folder ? (
            <p className="text-muted mb-0">Select a folder to fund.</p>
          ) : (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Folder</Form.Label>
                <Form.Control value={fundModal.folder.name} disabled />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Amount (NYAX)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step="0.001"
                  value={fundModal.amount}
                  onChange={(e) => setFundModal((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount to send"
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="soft-secondary" onClick={() => setFundModal({ show: false, folder: null, amount: '' })}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleFundFolder}
            disabled={!fundModal.folder || !fundModal.amount || funding}
          >
            {funding ? 'Sending…' : 'Send Funds'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={approveModal.show} onHide={() => setApproveModal({ show: false, folder: null })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Approve Folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!approveModal.folder ? (
            <p className="text-muted mb-0">Select a folder to approve.</p>
          ) : (
            <p className="mb-0">
              Approve <strong>{approveModal.folder.name}</strong> so it can receive NYAX distributions.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="soft-secondary" onClick={() => setApproveModal({ show: false, folder: null })}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleApproveFolder} disabled={!approveModal.folder || approving}>
            {approving ? 'Approving…' : 'Approve'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAllocationModal} onHide={() => setShowAllocationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Allocation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Folder ID</Form.Label>
                <Form.Control
                  type="number"
                  value={allocation.folderId}
                  onChange={(e) => setAllocation((prev) => ({ ...prev, folderId: e.target.value }))}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Permissions</Form.Label>
                <Form.Control
                  type="number"
                  value={allocation.permissions}
                  onChange={(e) => setAllocation((prev) => ({ ...prev, permissions: Number(e.target.value) }))}
                />
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Wallet address</Form.Label>
              <Form.Control
                value={allocation.account}
                onChange={(e) => setAllocation((prev) => ({ ...prev, account: e.target.value }))}
                placeholder="0x..."
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount (NYAX)</Form.Label>
              <Form.Control
                value={allocation.amount}
                onChange={(e) => setAllocation((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="1000"
              />
            </Form.Group>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Start date</Form.Label>
                <Form.Control
                  type="date"
                  value={allocation.startDate}
                  onChange={(e) => setAllocation((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </Col>
              <Col md={6}>
                <Form.Label>Cliff (days)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={allocation.cliffDays}
                  onChange={(e) => setAllocation((prev) => ({ ...prev, cliffDays: Number(e.target.value) }))}
                />
              </Col>
            </Row>
            <Form.Group>
              <Form.Label>Duration (days)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                value={allocation.durationDays}
                onChange={(e) => setAllocation((prev) => ({ ...prev, durationDays: Number(e.target.value) }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="soft-secondary" onClick={() => setShowAllocationModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAllocation}
            disabled={!allocation.folderId || !allocation.account || !allocation.amount}>
            Save Allocation
          </Button>
        </Modal.Footer>
      </Modal>

      <Offcanvas show={showDetailDrawer} onHide={() => setShowDetailDrawer(false)} placement="end" backdrop scroll>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Folder Detail</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {!selectedFolder ? (
            <p className="text-muted mb-0">Select a folder to inspect wallet level activity.</p>
          ) : (
            <>
              <div className="mb-4">
                <h5 className="mb-1">{selectedFolder.name}</h5>
                <p className="text-muted mb-2">Total allocated: {selectedFolder.totalAllocated} NYAX</p>
                <Badge bg={selectedFolder.locked ? 'soft-danger' : 'soft-success'} text={selectedFolder.locked ? 'danger' : 'success'}>
                  {selectedFolder.locked ? 'Locked' : 'Active'}
                </Badge>
              </div>
              <div className="border rounded-3 mb-4">
                <Table hover size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>Wallet</th>
                      <th>Permissions</th>
                      <th>Unlocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersLoading && (
                      <tr>
                        <td colSpan={3} className="text-center py-3">
                          <Spinner animation="border" size="sm" />
                        </td>
                      </tr>
                    )}
                    {!membersLoading && members.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-3 text-muted">
                          No wallets allocated yet
                        </td>
                      </tr>
                    )}
                    {!membersLoading &&
                      members.map((member) => (
                        <tr key={member.account}>
                          <td className="text-break">{member.account}</td>
                          <td>
                            <Badge bg="soft-secondary" text="secondary">
                              {member.permissions}
                            </Badge>
                          </td>
                          <td>{member.unlockedAmount}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  )
}

export default FolderRegistryPage
