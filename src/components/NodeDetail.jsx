import React, { useState, useEffect } from 'react'

const TYPE_COLORS = {
  core: '#3B82F6',
  feature: '#10B981',
  tech: '#6B7280',
  satellite: '#8B5CF6',
  pending: '#F59E0B',
  removed: '#EF4444',
}

export default function NodeDetail({ node, nodes, onBack, onNodeUpdate, onNodeDelete, onEdgeCreate }) {
  const [desc, setDesc] = useState(node.description || '')
  const [connectTarget, setConnectTarget] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)

  useEffect(() => {
    setDesc(node.description || '')
    setEditingDesc(false)
    setConnectTarget('')
  }, [node.id])

  const color = node.status === 'removed' ? TYPE_COLORS.removed : (TYPE_COLORS[node.type] || '#6B7280')

  const handleSaveDesc = () => {
    onNodeUpdate(node.id, { description: desc })
    setEditingDesc(false)
  }

  const handleSetActive = () => onNodeUpdate(node.id, { status: 'active' })
  const handleSetRemoved = () => onNodeUpdate(node.id, { status: 'removed' })
  const handleDelete = () => {
    if (window.confirm(`Mark "${node.label}" as removed?`)) {
      onNodeDelete(node.id)
    }
  }

  const handleConnect = () => {
    if (!connectTarget) return
    onEdgeCreate(node.id, connectTarget)
    setConnectTarget('')
  }

  const otherNodes = nodes.filter(n => n.id !== node.id && n.status !== 'removed')

  return (
    <div className="node-detail">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div className="node-detail-header" style={{ borderLeftColor: color }}>
        <h2 className="node-detail-title">{node.label}</h2>
        <div className="node-detail-meta">
          <span className="type-badge" style={{ color, borderColor: color }}>{node.type}</span>
          <span className="project-badge">{node.project}</span>
        </div>
      </div>

      <div className="node-detail-status">
        <span className="detail-label">Status</span>
        <div className="status-buttons">
          <button
            className={`status-btn ${node.status === 'active' ? 'active' : ''}`}
            onClick={handleSetActive}
            style={node.status === 'active' ? { borderColor: '#10B981', color: '#10B981' } : {}}
          >
            Active
          </button>
          <button
            className={`status-btn ${node.status === 'removed' ? 'active' : ''}`}
            onClick={handleSetRemoved}
            style={node.status === 'removed' ? { borderColor: '#EF4444', color: '#EF4444' } : {}}
          >
            Removed
          </button>
        </div>
      </div>

      <div className="node-detail-section">
        <div className="detail-label-row">
          <span className="detail-label">Description</span>
          {!editingDesc && (
            <button className="link-btn" onClick={() => setEditingDesc(true)}>Edit</button>
          )}
        </div>
        {editingDesc ? (
          <div className="desc-edit">
            <textarea
              className="desc-textarea"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="desc-edit-actions">
              <button className="btn-primary" onClick={handleSaveDesc}>Save</button>
              <button className="btn-ghost" onClick={() => { setDesc(node.description || ''); setEditingDesc(false) }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p className="node-detail-desc">{node.description || <em style={{ color: '#666' }}>No description</em>}</p>
        )}
      </div>

      <div className="node-detail-section">
        <span className="detail-label">Connect To</span>
        <div className="connect-row">
          <select
            className="connect-select"
            value={connectTarget}
            onChange={e => setConnectTarget(e.target.value)}
          >
            <option value="">Select a node…</option>
            {otherNodes.map(n => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={handleConnect} disabled={!connectTarget}>
            Connect
          </button>
        </div>
      </div>

      <div className="node-detail-section">
        <span className="detail-label">Timestamps</span>
        <div className="timestamp-row">
          <span className="ts-label">Created</span>
          <span className="ts-value">{new Date(node.created_at).toLocaleDateString()}</span>
        </div>
        <div className="timestamp-row">
          <span className="ts-label">Updated</span>
          <span className="ts-value">{new Date(node.updated_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="node-detail-danger">
        <button className="btn-danger" onClick={handleDelete}>
          Remove Node
        </button>
      </div>
    </div>
  )
}
