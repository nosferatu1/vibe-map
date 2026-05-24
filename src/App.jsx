import React, { useState, useEffect, useCallback, useMemo } from 'react'
import MindMap from './components/MindMap.jsx'
import Sidebar from './components/Sidebar.jsx'

export default function App() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [showRemoved, setShowRemoved] = useState(false)
  const [selectedProject, setSelectedProject] = useState('all')

  // Feature 2 & 3: selection + hover state
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)

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
    setSelectedNodeId(node.id)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedNode(null)
    setSelectedNodeId(null)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Feature 3: hover handlers
  const handleNodeMouseEnter = useCallback((event, node) => {
    setHoveredNodeId(node.id)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null)
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
      setSelectedNodeId(null)
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

  // Feature 1: handle user-drawn connections
  const handleConnect = useCallback(async (connection) => {
    try {
      const res = await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: connection.source,
          target: connection.target,
        }),
      })
      const saved = await res.json()
      setEdges(prev => [...prev, {
        ...saved,
        type: 'smoothstep',
        style: { stroke: '#60A5FA', strokeWidth: 1.5, strokeDasharray: '4 3' },
        markerEnd: { type: 'arrowclosed', color: '#60A5FA', width: 8, height: 8 },
        pathOptions: { borderRadius: 16 },
      }])
    } catch (err) {
      console.error('Failed to create connection:', err)
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

  // Feature 2: derive display edges based on hover + selection
  const displayEdges = useMemo(() => {
    return edges.map(edge => {
      const isConnectedToHovered = hoveredNodeId &&
        (edge.source === hoveredNodeId || edge.target === hoveredNodeId)
      const isConnectedToSelected = selectedNodeId &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId)

      const shouldShow = isConnectedToHovered || isConnectedToSelected
      const isAnimated = !!isConnectedToSelected

      return {
        ...edge,
        animated: isAnimated,
        style: {
          ...edge.style,
          opacity: shouldShow ? 1 : 0,
          strokeWidth: isConnectedToSelected ? 2.5 : (edge.style?.strokeWidth || 1.5),
          stroke: isConnectedToSelected
            ? '#60A5FA'
            : edge.style?.stroke,
          transition: 'opacity 0.2s ease',
        },
      }
    })
  }, [edges, hoveredNodeId, selectedNodeId])

  // Feature 2: derive display nodes based on selection (dim unconnected)
  const displayNodes = useMemo(() => {
    if (!selectedNodeId) return nodes
    const connectedIds = new Set([selectedNodeId])
    edges.forEach(e => {
      if (e.source === selectedNodeId) connectedIds.add(e.target)
      if (e.target === selectedNodeId) connectedIds.add(e.source)
    })
    return nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: connectedIds.has(node.id) ? 1 : 0.25,
        transition: 'opacity 0.2s ease',
      },
    }))
  }, [nodes, selectedNodeId, edges])

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
        nodes={displayNodes}
        edges={displayEdges}
        showRemoved={showRemoved}
        selectedNode={selectedNode}
        onNodeClick={handleNodeClick}
        onEdgeDelete={handleEdgeDelete}
        selectedProject={selectedProject}
        onSavePositions={handleSavePositions}
        onConnect={handleConnect}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onClearSelection={handleClearSelection}
      />
    </div>
  )
}
