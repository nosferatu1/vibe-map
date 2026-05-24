import React, { useState, useMemo } from 'react'
import NodeDetail from './NodeDetail.jsx'

const TYPE_COLORS = {
  core: '#3B82F6',
  feature: '#10B981',
  tech: '#6B7280',
  satellite: '#8B5CF6',
  pending: '#F59E0B',
  removed: '#EF4444',
}

const TYPE_OPTIONS = ['core', 'feature', 'tech', 'satellite', 'pending']

const LEGEND = [
  { type: 'root', label: 'Root', color: '#3B82F6', shape: 'pill' },
  { type: 'category', label: 'Category', color: '#A78BFA', shape: 'rect' },
  { type: 'core', label: 'Feature/Core' },
  { type: 'tech', label: 'Tech' },
  { type: 'satellite', label: 'Satellite' },
  { type: 'pending', label: 'Pending' },
  { type: 'removed', label: 'Removed' },
]

export default function Sidebar({
  selectedNode,
  nodes,
  showRemoved,
  onShowRemovedChange,
  onBack,
  onNodeUpdate,
  onNodeDelete,
  onNodeCreate,
  onEdgeCreate,
  selectedProject,
  onProjectChange,
}) {
  const [form, setForm] = useState({
    label: '',
    type: 'pending',
    project: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Derive unique project names from all loaded nodes
  const projectOptions = useMemo(() => {
    const names = new Set()
    nodes.forEach(n => { if (n.project) names.add(n.project) })
    return Array.from(names).sort()
  }, [nodes])

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.label.trim()) return
    setSubmitting(true)
    // Use selected project as default if form field is empty
    const projectValue = form.project.trim() || (selectedProject !== 'all' ? selectedProject : 'main')
    await onNodeCreate({ ...form, project: projectValue })
    setForm({ label: '', type: 'pending', project: '', description: '' })
    setSubmitting(false)
  }

  // When selected project changes, keep form project field in sync
  // (only if user hasn't typed something custom)
  const formProjectPlaceholder = selectedProject !== 'all' ? selectedProject : 'main'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-dot" />
          <span className="logo-text">Vibe Map</span>
        </div>
        <div className="project-switcher-wrapper">
          <label className="project-switcher-label">Project</label>
          <select
            className="project-switcher-select"
            value={selectedProject}
            onChange={e => onProjectChange(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projectOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="sidebar-content">
        {selectedNode ? (
          <NodeDetail
            node={selectedNode}
            nodes={nodes}
            onBack={onBack}
            onNodeUpdate={onNodeUpdate}
            onNodeDelete={onNodeDelete}
            onEdgeCreate={onEdgeCreate}
          />
        ) : (
          <div className="add-node-form-wrapper">
            <h3 className="section-title">Add Node</h3>
            <form className="add-node-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Label</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Node name…"
                  value={form.label}
                  onChange={e => handleFormChange('label', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={e => handleFormChange('type', e.target.value)}
                >
                  {TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Project</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={formProjectPlaceholder}
                  value={form.project}
                  onChange={e => handleFormChange('project', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Brief note…"
                  value={form.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <button className="btn-primary btn-full" type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : '+ Add Node'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showRemoved}
            onChange={e => onShowRemovedChange(e.target.checked)}
            className="toggle-checkbox"
          />
          <span>Show Removed Nodes</span>
        </label>

        <div className="legend">
          {LEGEND.map(({ type, label, color, shape }) => {
            const bg = color || TYPE_COLORS[type] || '#6B7280'
            const isRect = shape === 'rect'
            const isPill = shape === 'pill'
            return (
              <div key={type} className="legend-item">
                <span
                  className="legend-dot"
                  style={{
                    background: bg,
                    borderRadius: isPill ? '9999px' : isRect ? '3px' : '50%',
                    width: isPill ? '16px' : '8px',
                    height: isPill ? '8px' : '8px',
                  }}
                />
                <span className="legend-label">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
