import React, { useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import '@xyflow/react/dist/style.css'
import { computeMindMapLayout, CATEGORY_COLORS } from '../utils/mindMapLayout.js'

// ─── Type colors for leaf nodes ─────────────────────────────────────────────
const TYPE_COLORS = {
  core: '#3B82F6',
  feature: '#10B981',
  tech: '#6B7280',
  satellite: '#8B5CF6',
  pending: '#F59E0B',
  removed: '#EF4444',
}

// ─── RootNode ────────────────────────────────────────────────────────────────
function RootNode({ data }) {
  return (
    <div className="root-node">
      <Handle type="target" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <span className="root-node-label">{data.label}</span>
    </div>
  )
}

// ─── CategoryNode ─────────────────────────────────────────────────────────────
function CategoryNode({ data }) {
  const color = data.catColor || '#6B7280'
  return (
    <div className="category-node" style={{ borderColor: color }}>
      <Handle type="target" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <span className="category-node-label" style={{ color }}>{data.label}</span>
    </div>
  )
}

// ─── LeafNode ─────────────────────────────────────────────────────────────────
function LeafNode({ data, selected }) {
  const accent = data.accentColor || '#6B7280'
  const isRemoved = data.status === 'removed'

  return (
    <div
      className={`leaf-node ${selected ? 'leaf-node--selected' : ''}`}
      style={{ borderLeftColor: accent, opacity: isRemoved ? 0.4 : 1 }}
      onClick={() => data.onNodeClick && data.onNodeClick(data.rawNode || data)}
    >
      <Handle type="target" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left}   id="left"   style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  id="right"  style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top}    id="top"    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <div className="leaf-node-label">{data.label}</div>
      {data.description && (
        <div className="leaf-node-desc">{data.description}</div>
      )}
      {data.showProject && data.project && (
        <div className="leaf-node-project">{data.project}</div>
      )}
    </div>
  )
}

const nodeTypes = {
  rootNode: RootNode,
  categoryNode: CategoryNode,
  leafNode: LeafNode,
}

// ─── MindMapInner ─────────────────────────────────────────────────────────────
function MindMapInner({
  nodes: rawNodes,
  edges: rawEdges,
  showRemoved,
  selectedNode,
  onNodeClick,
  onEdgeDelete,
  selectedProject,
  onSavePositions,
  onConnect,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onClearSelection,
}) {
  const { getNodes } = useReactFlow()

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    return computeMindMapLayout(rawNodes, rawEdges, selectedProject, showRemoved)
  }, [rawNodes, rawEdges, selectedProject, showRemoved])

  // Inject onNodeClick + selectedNode highlight into leaf nodes
  const flowNodes = useMemo(() => {
    return layoutNodes.map(n => {
      if (n.type !== 'leafNode') return n
      return {
        ...n,
        data: {
          ...n.data,
          onNodeClick,
        },
        selected: selectedNode?.id === n.id,
      }
    })
  }, [layoutNodes, selectedNode, onNodeClick])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  // Keep nodes/edges in sync with layout changes
  useEffect(() => {
    setNodes(flowNodes)
  }, [flowNodes, setNodes])

  useEffect(() => {
    setEdges(layoutEdges)
  }, [layoutEdges, setEdges])

  const onEdgeClick = useCallback((event, edge) => {
    // Only allow deleting user-defined edges (dashed blue ones from DB)
    // Auto-hierarchy edges have no strokeDasharray; user edges do
    if (!edge.style?.strokeDasharray) return
    if (window.confirm(`Delete edge from ${edge.source} to ${edge.target}?`)) {
      onEdgeDelete(edge.id)
    }
  }, [onEdgeDelete])

  const handleAutoLayout = useCallback(() => {
    const { nodes: freshNodes, edges: freshEdges } = computeMindMapLayout(
      rawNodes,
      rawEdges,
      selectedProject,
      showRemoved
    )
    const withCallbacks = freshNodes.map(n => {
      if (n.type !== 'leafNode') return n
      return { ...n, data: { ...n.data, onNodeClick } }
    })
    setNodes(withCallbacks)
    setEdges(freshEdges)

    // Save positions for real data nodes
    if (onSavePositions) {
      const dataNodes = freshNodes.filter(n => n.type === 'leafNode')
      onSavePositions(dataNodes.map(n => ({ id: n.id, position: n.position })))
    }
  }, [rawNodes, rawEdges, selectedProject, showRemoved, onNodeClick, setNodes, setEdges, onSavePositions])

  // ─── Export PNG ───────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const nodesBounds = getNodesBounds(getNodes().filter(n => !n.id.startsWith('__')))
    const imageWidth = 1600
    const imageHeight = 900
    const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.4, 2, 80)

    const viewport_el = document.querySelector('.react-flow__viewport')
    if (!viewport_el) return

    toPng(viewport_el, {
      backgroundColor: '#0A0A0A',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then(dataUrl => {
      const projectName = selectedProject !== 'all' ? selectedProject : 'vibe-map'
      const a = document.createElement('a')
      a.setAttribute('download', `vibe-map-${projectName}.png`)
      a.setAttribute('href', dataUrl)
      a.click()
    })
  }, [getNodes, selectedProject])

  return (
    <div className="mindmap-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={() => onClearSelection?.()}
        connectionMode="loose"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        edgesUpdatable={false}
        edgesFocusable={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#444', strokeWidth: 1.5 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} color="#333" gap={20} size={1} />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'rootNode') return '#3B82F6'
            if (node.type === 'categoryNode') return CATEGORY_COLORS[node.data?.category] || '#555'
            const raw = rawNodes.find(n => n.id === node.id)
            if (!raw) return '#444'
            return raw.status === 'removed' ? TYPE_COLORS.removed : (TYPE_COLORS[raw.type] || '#444')
          }}
          style={{ background: '#1A1A1A', border: '1px solid #333' }}
          maskColor="rgba(0,0,0,0.4)"
        />
        <Controls style={{ background: '#1A1A1A', border: '1px solid #333', color: '#ccc' }} />
        <Panel position="top-right" style={{ display: 'flex', gap: 8 }}>
          <button className="auto-layout-btn" onClick={handleExport}>Export PNG</button>
          <button className="auto-layout-btn" onClick={handleAutoLayout}>Auto Layout</button>
        </Panel>
      </ReactFlow>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function MindMap(props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  )
}
