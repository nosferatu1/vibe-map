import React, { useState, useEffect, useCallback } from 'react'
import MindMap from './components/MindMap.jsx'
import Sidebar from './components/Sidebar.jsx'

export default function App() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [showRemoved, setShowRemoved] = useState(false)
  const [selectedProject, setSelectedProject] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/nodes')
      const data = await res.json()
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
    } catch (err) {
      console.error('Failed to fetch nodes:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleNodeClick = useCallback((node) => {
    // Ignore virtual nodes
    if (node?.id?.startsWith('__')) return
    setSelectedNode(node)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeUpdate = useCallback(async (id, updates) => {
    try {
      const res = await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const updated = await res.json()
      setNodes(prev => prev.map(n => n.id === id ? updated : n))
      if (selectedNode?.id === id) setSelectedNode(updated)
    } catch (err) {
      console.error('Failed to update node:', err)
    }
  }, [selectedNode])

  const handleNodeDelete = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' })
      const updated = await res.json()
      setNodes(prev => prev.map(n => n.id === id ? updated : n))
      setSelectedNode(null)
    } catch (err) {
      console.error('Failed to delete node:', err)
    }
  }, [])

  const handleNodeCreate = useCallback(async (nodeData) => {
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodeData),
      })
      const created = await res.json()
      setNodes(prev => [...prev, created])
    } catch (err) {
      console.error('Failed to create node:', err)
    }
  }, [])

  const handleEdgeCreate = useCallback(async (source, target) => {
    try {
      const res = await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target }),
      })
      const created = await res.json()
      setEdges(prev => [...prev, created])
    } catch (err) {
      console.error('Failed to create edge:', err)
    }
  }, [])

  const handleEdgeDelete = useCallback(async (id) => {
    try {
      await fetch(`/api/edges/${id}`, { method: 'DELETE' })
      setEdges(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Failed to delete edge:', err)
    }
  }, [])

  // Save positions for data nodes after auto-layout
  const handleSavePositions = useCallback(async (nodePositions) => {
    await Promise.all(
      nodePositions.map(({ id, position }) =>
        fetch(`/api/nodes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position }),
        }).catch(err => console.error('Failed to save position:', id, err))
      )
    )
  }, [])

  return (
    <div className="app-layout">
      <Sidebar
        selectedNode={selectedNode}
        nodes={nodes}
        showRemoved={showRemoved}
        onShowRemovedChange={setShowRemoved}
        onBack={handleBack}
        onNodeUpdate={handleNodeUpdate}
        onNodeDelete={handleNodeDelete}
        onNodeCreate={handleNodeCreate}
        onEdgeCreate={handleEdgeCreate}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
      />
      <MindMap
        nodes={nodes}
        edges={edges}
        showRemoved={showRemoved}
        selectedNode={selectedNode}
        onNodeClick={handleNodeClick}
        onEdgeDelete={handleEdgeDelete}
        selectedProject={selectedProject}
        onSavePositions={handleSavePositions}
      />
    </div>
  )
}
