import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3002
const DATA_FILE = path.join(__dirname, 'data', 'nodes.json')
const SEED_FILE = path.join(__dirname, 'data', 'nodes.seed.json')

// Auto-seed on first run
if (!fs.existsSync(DATA_FILE)) {
  fs.copyFileSync(SEED_FILE, DATA_FILE)
  console.log('nodes.json seeded from nodes.seed.json')
}

app.use(cors())
app.use(express.json())

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw)
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function toSlug(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// GET /api/nodes — return all nodes + edges, optionally filtered by ?project=name
app.get('/api/nodes', (req, res) => {
  try {
    const data = readData()
    const { project } = req.query
    if (project) {
      const filteredNodes = data.nodes.filter(n => n.project === project)
      const filteredIds = new Set(filteredNodes.map(n => n.id))
      const filteredEdges = data.edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target))
      return res.json({ nodes: filteredNodes, edges: filteredEdges })
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data', details: err.message })
  }
})

// POST /api/nodes — create a new node
app.post('/api/nodes', (req, res) => {
  try {
    const data = readData()
    const { label, type, project, description, position } = req.body

    if (!label) return res.status(400).json({ error: 'label is required' })

    const slug = toSlug(label)
    const suffix = Date.now().toString(36)
    const id = `${slug}-${suffix}`
    const now = new Date().toISOString()

    const newNode = {
      id,
      label,
      type: type || 'pending',
      status: 'active',
      project: project || 'main',
      description: description || '',
      position: position || { x: Math.floor(Math.random() * 400) + 100, y: Math.floor(Math.random() * 400) + 100 },
      created_at: now,
      updated_at: now,
    }

    data.nodes.push(newNode)
    writeData(data)
    res.status(201).json(newNode)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create node', details: err.message })
  }
})

// PATCH /api/nodes/:id — update node fields
app.patch('/api/nodes/:id', (req, res) => {
  try {
    const data = readData()
    const idx = data.nodes.findIndex(n => n.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Node not found' })

    const allowed = ['label', 'type', 'status', 'project', 'description', 'position']
    const updates = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }

    data.nodes[idx] = { ...data.nodes[idx], ...updates, updated_at: new Date().toISOString() }
    writeData(data)
    res.json(data.nodes[idx])
  } catch (err) {
    res.status(500).json({ error: 'Failed to update node', details: err.message })
  }
})

// DELETE /api/nodes/:id — soft delete: set status to "removed"
app.delete('/api/nodes/:id', (req, res) => {
  try {
    const data = readData()
    const idx = data.nodes.findIndex(n => n.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Node not found' })

    data.nodes[idx].status = 'removed'
    data.nodes[idx].updated_at = new Date().toISOString()
    writeData(data)
    res.json(data.nodes[idx])
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete node', details: err.message })
  }
})

// POST /api/edges — create an edge
app.post('/api/edges', (req, res) => {
  try {
    const data = readData()
    const { source, target } = req.body

    if (!source || !target) return res.status(400).json({ error: 'source and target are required' })

    const id = `e-${source}-${target}-${Date.now().toString(36)}`
    const newEdge = { id, source, target }

    data.edges.push(newEdge)
    writeData(data)
    res.status(201).json(newEdge)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create edge', details: err.message })
  }
})

// DELETE /api/edges/:id — hard delete an edge
app.delete('/api/edges/:id', (req, res) => {
  try {
    const data = readData()
    const idx = data.edges.findIndex(e => e.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Edge not found' })

    data.edges.splice(idx, 1)
    writeData(data)
    res.json({ deleted: req.params.id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete edge', details: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Vibe Map API running at http://localhost:${PORT}`)
  console.log(`Data file: ${DATA_FILE}`)
})
