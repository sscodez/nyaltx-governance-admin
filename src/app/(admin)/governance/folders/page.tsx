'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'

import PageTitle from '@/components/PageTitle'
import { useNotificationContext } from '@/context/useNotificationContext'
import useDaoService from '@/hooks/useDaoService'
import type { FolderInfo, FolderMemberInfo } from '@/services/contracts'

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

const FolderRegistryPage = () => {
  const { daoService, loading, error } = useDaoService()
  const { showNotification } = useNotificationContext()

  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [fetching, setFetching] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFolder, setNewFolder] = useState(defaultTemplate)

  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [allocation, setAllocation] = useState(defaultAllocation)

  const [detailModal, setDetailModal] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<FolderInfo | null>(null)
  const [members, setMembers] = useState<FolderMemberInfo[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const canMutate = useMemo(() => Boolean(daoService && allocation && newFolder), [daoService, allocation, newFolder])

  useEffect(() => {
    if (!daoService) return
    const load = async () => {
      setFetching(true)
      try {
        const list = await daoService.folders.getAllFolders()
        setFolders(list)
      } catch (err: any) {
        showNotification({ message: err?.message || 'Failed to load folders', variant: 'danger' })
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [daoService, showNotification])

  const refreshFolders = async () => {
    if (!daoService) return
    setFetching(true)
    try {
      const list = await daoService.folders.getAllFolders()
      setFolders(list)
    } catch (err: any) {
      showNotification({ message: err?.message || 'Failed to refresh folders', variant: 'danger' })
    } finally {
      setFetching(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!daoService) return
    try {
      await daoService.folders.createFolder(newFolder.name, Number(newFolder.permissions), {
        cliff: Number(newFolder.cliffDays) * 86400,
        duration: Number(newFolder.durationDays) * 86400,
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
          cliff: Number(allocation.cliffDays) * 86400,
          duration: Number(allocation.durationDays) * 86400,
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
    setDetailModal(true)
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

  return (
    <>
      <PageTitle title="Folder Registry" />
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <div>
                <h4 className="mb-1">Registry Overview</h4>
                <p className="text-muted mb-0">Manage token distribution folders, vesting templates, and allocations.</p>
              </div>
              <div className="d-flex gap-2">
                <Button variant="soft-secondary" onClick={refreshFolders} disabled={fetching || loading}>
                  {fetching ? 'Refreshing…' : 'Refresh'}
                </Button>
                <Button variant="primary" onClick={() => setShowCreateModal(true)} disabled={!daoService}>
                  Create Folder
                </Button>
                <Button variant="outline-primary" onClick={() => setShowAllocationModal(true)} disabled={!daoService}>
                  New Allocation
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
              <h5 className="mb-0">Folders</h5>
              {(loading || fetching) && <Spinner animation="border" size="sm" />}
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Allocated</th>
                      <th>Members</th>
                      <th>Permissions</th>
                      <th>Lock</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {folders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          {fetching ? 'Loading folders…' : 'No folders found yet'}
                        </td>
                      </tr>
                    )}
                    {folders.map((folder) => (
                      <tr key={folder.id}>
                        <td>#{folder.id}</td>
                        <td className="fw-semibold">{folder.name}</td>
                        <td>{folder.totalAllocated} NYAX</td>
                        <td>{folder.members.length}</td>
                        <td>
                          <Badge bg="soft-info" text="info">
                            {folder.defaultPermissions}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={folder.locked ? 'soft-danger' : 'soft-success'} text={folder.locked ? 'danger' : 'success'}>
                            {folder.locked ? 'Locked' : 'Unlocked'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Button size="sm" variant="soft-primary" onClick={() => openFolderDetail(folder)}>
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
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

      <Modal show={detailModal} onHide={() => setDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Folder Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedFolder && (
            <>
              <div className="d-flex flex-wrap justify-content-between mb-3">
                <div>
                  <h5 className="mb-1">{selectedFolder.name}</h5>
                  <p className="text-muted mb-0">Total allocated: {selectedFolder.totalAllocated} NYAX</p>
                </div>
                <Badge bg="soft-primary" text="primary">
                  Folder #{selectedFolder.id}
                </Badge>
              </div>
              <div className="table-responsive">
                <Table hover size="sm">
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
                          <Spinner animation="border" size="sm" /> Loading members…
                        </td>
                      </tr>
                    )}
                    {!membersLoading && members.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center text-muted py-3">
                          No members yet
                        </td>
                      </tr>
                    )}
                    {!membersLoading &&
                      members.map((member) => (
                        <tr key={member.account}>
                          <td className="text-break">{member.account}</td>
                          <td>{member.permissions}</td>
                          <td>{member.unlockedAmount}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>
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

export default FolderRegistryPage
