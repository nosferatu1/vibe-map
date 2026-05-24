// Custom directional mind-map layout — no dagre dependency

const ROOT_W = 180;
const ROOT_H = 56;
const CAT_W = 160;
const CAT_H = 44;
const LEAF_W = 240;
const LEAF_H = 120;        // actual rendered height with wrapping text is ~110-120px
const H_GAP = 140;         // horizontal gap between node columns
const V_GAP = 40;          // gap between leaf nodes vertically
const H_BRANCH_GAP = 160;  // horizontal gap between category and leaf column
const V_BRANCH_GAP = 140;  // vertical gap between category and leaf row

// Category color mapping
export const CATEGORY_COLORS = {
  features: '#10B981',   // emerald
  tech: '#6B7280',       // gray
  satellites: '#8B5CF6', // purple
  pending: '#F59E0B',    // amber
}

// Alias for internal use
const CAT_COLORS = CATEGORY_COLORS

// Type colors for leaf nodes
const TYPE_COLORS = {
  core: '#3B82F6',
  feature: '#10B981',
  tech: '#6B7280',
  satellite: '#8B5CF6',
  pending: '#F59E0B',
}

// Which node types go into which category
const TYPE_TO_CATEGORY = {
  feature: 'features',
  core: 'features',
  tech: 'tech',
  satellite: 'satellites',
  pending: 'pending',
}

const CATEGORY_LABELS = {
  features: 'Features',
  tech: 'Tech Stack',
  satellites: 'Satellites',
  pending: 'Pending',
}

// Direction each category branches toward
const CATEGORY_DIRECTION = {
  features: 'LEFT',
  tech: 'RIGHT',
  satellites: 'TOP',
  pending: 'BOTTOM',
}

/**
 * Compute positions for one project cluster.
 * Root is placed at (originX, originY).
 * Returns { flowNodes, autoEdges, bbox: { minX, maxX, minY, maxY } }
 */
function buildProjectLayout(projectName, projectNodes, originX, originY, selectedProject) {
  const rootId = `__root__${projectName}`

  // Group data nodes by category
  const categoryGroups = {}
  for (const node of projectNodes) {
    const cat = TYPE_TO_CATEGORY[node.type] || 'pending'
    if (!categoryGroups[cat]) categoryGroups[cat] = []
    categoryGroups[cat].push(node)
  }

  const usedCategories = Object.keys(categoryGroups)

  const flowNodes = []
  const autoEdges = []

  // Track bounding box (in cluster-local coords, will be offset by origin later)
  let minX = 0, maxX = ROOT_W, minY = 0, maxY = ROOT_H

  const expandBbox = (x, y, w, h) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + w)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y + h)
  }

  // Root node
  flowNodes.push({
    id: rootId,
    type: 'rootNode',
    position: {
      x: originX,
      y: originY,
    },
    data: {
      label: projectName,
      projectName,
    },
    selectable: true,
    draggable: true,
  })

  // Root center in absolute coords
  const rootCX = originX + ROOT_W / 2
  const rootCY = originY + ROOT_H / 2

  for (const catKey of usedCategories) {
    const catId = `__cat__${projectName}__${catKey}`
    const direction = CATEGORY_DIRECTION[catKey] || 'RIGHT'
    const leaves = categoryGroups[catKey]
    const catColor = CAT_COLORS[catKey] || '#6B7280'

    let catX, catY  // top-left of category node (absolute)

    if (direction === 'LEFT') {
      catX = rootCX - ROOT_W / 2 - H_GAP - CAT_W
      catY = rootCY - CAT_H / 2
    } else if (direction === 'RIGHT') {
      catX = rootCX + ROOT_W / 2 + H_GAP
      catY = rootCY - CAT_H / 2
    } else if (direction === 'TOP') {
      catX = rootCX - CAT_W / 2
      catY = rootCY - ROOT_H / 2 - V_BRANCH_GAP - CAT_H
    } else { // BOTTOM
      catX = rootCX - CAT_W / 2
      catY = rootCY + ROOT_H / 2 + V_BRANCH_GAP
    }

    flowNodes.push({
      id: catId,
      type: 'categoryNode',
      position: { x: catX, y: catY },
      data: {
        label: CATEGORY_LABELS[catKey],
        category: catKey,
        color: catColor,
        catColor: catColor,
      },
      selectable: true,
      draggable: true,
    })

    expandBbox(catX - originX, catY - originY, CAT_W, CAT_H)

    // Handle directions for this branch
    const handleMap = {
      LEFT:   { sourceHandle: 'left',   targetHandle: 'right'  },
      RIGHT:  { sourceHandle: 'right',  targetHandle: 'left'   },
      TOP:    { sourceHandle: 'top',    targetHandle: 'bottom' },
      BOTTOM: { sourceHandle: 'bottom', targetHandle: 'top'    },
    }
    const handles = handleMap[direction] || handleMap.RIGHT

    // Root → Category edge
    autoEdges.push({
      id: `edge-root-${catKey}-${projectName}`,
      source: rootId,
      target: catId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'smoothstep',
      pathOptions: { borderRadius: 16 },
      style: { stroke: '#444', strokeWidth: 1.5 },
      markerEnd: { type: 'arrowclosed', color: '#444', width: 10, height: 10 },
      selectable: false,
    })

    // Category center
    const catCX = catX + CAT_W / 2
    const catCY = catY + CAT_H / 2

    // Position leaf nodes
    const n = leaves.length

    for (let i = 0; i < n; i++) {
      const node = leaves[i]
      let leafX, leafY

      if (direction === 'LEFT' || direction === 'RIGHT') {
        // Stack vertically, centered around category center
        const totalHeight = n * LEAF_H + (n - 1) * V_GAP
        const startY = catCY - totalHeight / 2
        const leafTopY = startY + i * (LEAF_H + V_GAP)

        if (direction === 'LEFT') {
          leafX = catX - H_BRANCH_GAP - LEAF_W
        } else {
          leafX = catX + CAT_W + H_BRANCH_GAP
        }
        leafY = leafTopY
      } else {
        // Stack vertically, centered with category node
        const totalHeight = n * LEAF_H + (n - 1) * V_GAP
        leafX = catCX - LEAF_W / 2
        if (direction === 'TOP') {
          // Leaves stack ABOVE the category; topmost leaf first
          const startY = catY - V_BRANCH_GAP - totalHeight
          leafY = startY + i * (LEAF_H + V_GAP)
        } else { // BOTTOM
          // Leaves stack BELOW the category
          const startY = catY + CAT_H + V_BRANCH_GAP
          leafY = startY + i * (LEAF_H + V_GAP)
        }
      }

      flowNodes.push({
        id: node.id,
        type: 'leafNode',
        position: { x: leafX, y: leafY },
        data: {
          ...node,
          accentColor: CAT_COLORS[catKey] || TYPE_COLORS[node.type] || '#6B7280',
          showProject: selectedProject === 'all',
        },
        selected: false,
      })

      expandBbox(leafX - originX, leafY - originY, LEAF_W, LEAF_H)

      // Category → Leaf edge (skip tech — tech leaves float free, connected manually)
      if (catKey !== 'tech') {
        autoEdges.push({
          id: `edge-${catKey}-${node.id}`,
          source: catId,
          target: node.id,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'smoothstep',
          pathOptions: { borderRadius: 16 },
          style: { stroke: catColor, strokeWidth: 1.5, opacity: 0.5 },
          markerEnd: { type: 'arrowclosed', color: catColor, width: 8, height: 8 },
          selectable: false,
        })
      }
    }
  }

  return {
    flowNodes,
    autoEdges,
    bbox: {
      minX: originX + minX,
      maxX: originX + maxX,
      minY: originY + minY,
      maxY: originY + maxY,
    },
  }
}

export function computeMindMapLayout(apiNodes, apiEdges, selectedProject, showRemoved = false) {
  // Filter by visibility
  const visibleNodes = apiNodes.filter(n => {
    if (!showRemoved && n.status === 'removed') return false
    return true
  })

  // Group by project
  const projectMap = {}
  for (const node of visibleNodes) {
    const proj = node.project || 'main'
    if (selectedProject && selectedProject !== 'all' && proj !== selectedProject) continue
    if (!projectMap[proj]) projectMap[proj] = []
    projectMap[proj].push(node)
  }

  const projectNames = Object.keys(projectMap)
  if (projectNames.length === 0) return { nodes: [], edges: [] }

  const allFlowNodes = []
  const allAutoEdges = []

  const CLUSTER_H_PADDING = 400  // horizontal padding between project clusters

  let cursorX = 0  // tracks the right edge of the previous cluster

  for (let pi = 0; pi < projectNames.length; pi++) {
    const projectName = projectNames[pi]
    const projectNodes = projectMap[projectName]

    // Dry run at origin 0 to learn the bbox, then shift
    const dryRun = buildProjectLayout(projectName, projectNodes, 0, 0, selectedProject)
    const bboxWidth = dryRun.bbox.maxX - dryRun.bbox.minX
    const bboxMinX = dryRun.bbox.minX

    let originX
    if (pi === 0) {
      originX = 0
    } else {
      originX = cursorX + CLUSTER_H_PADDING - bboxMinX
    }

    const { flowNodes, autoEdges, bbox } = buildProjectLayout(
      projectName,
      projectNodes,
      originX,
      0,
      selectedProject,
    )

    // Stamp selectedProject onto leaf node data
    for (const fn of flowNodes) {
      if (fn.type === 'leafNode') {
        fn.data = { ...fn.data, selectedProject }
      }
    }

    allFlowNodes.push(...flowNodes)
    allAutoEdges.push(...autoEdges)

    cursorX = bbox.maxX
  }

  // User-defined edges from DB (overlaid, dashed blue)
  const nodeIds = new Set(allFlowNodes.map(n => n.id))
  const userEdges = apiEdges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(edge => ({
      ...edge,
      type: 'straight',
      style: { stroke: '#60A5FA', strokeWidth: 1.5, strokeDasharray: '4 3' },
      markerEnd: { type: 'arrowclosed', color: '#60A5FA', width: 8, height: 8 },
    }))

  return {
    nodes: allFlowNodes,
    edges: [...allAutoEdges, ...userEdges],
  }
}
