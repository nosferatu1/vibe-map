# Vibe Map

A local mind map that tracks your app's building blocks as you build it — powered by conversations with Claude.

Nodes are your features, tech stack, satellites (test projects), and pending items. They move through `pending → active → removed` as your app evolves. One global instance maps all your projects.

![Vibe Map Screenshot](https://placeholder)

---

## How it works

1. You build an app with Claude
2. Run `/vibe-map` in Claude Code to snapshot the current state
3. Vibe Map reads your codebase, extracts nodes, and syncs them to the mind map
4. Open `http://localhost:5173` to see the living map of your project

---

## Setup

**Requirements:** Node.js 18+

```bash
git clone https://github.com/YOUR_USERNAME/vibe-map.git
cd vibe-map
npm install
npm run dev
```

Open **http://localhost:5173**

The API runs on **port 3001** by default. If that port is taken, it will try **3002** automatically.

---

## Claude Code Skill

To use the `/vibe-map` skill in Claude Code, copy the skill file to your skills directory:

```bash
mkdir -p ~/.claude/skills/vibe-map
cp skill/SKILL.md ~/.claude/skills/vibe-map/SKILL.md
```

Then from any project in Claude Code:

```
/vibe-map
```

Claude will scan your codebase, extract nodes, and sync them to the running Vibe Map instance.

---

## Node types

| Type | Color | Description |
|------|-------|-------------|
| `core` | Blue | The main application |
| `feature` | Green | A working capability or module |
| `tech` | Gray | A technology, library, or infrastructure piece |
| `satellite` | Purple | A test harness, staging env, or validation project |
| `pending` | Amber | Something discussed but not yet built |

---

## Layout

- **Features** → left branch
- **Tech Stack** → right branch
- **Satellites** → top branch
- **Pending** → bottom branch

Hit **Auto Layout** in the top-right of the canvas to reposition everything cleanly.

---

## API

The local API runs at `http://localhost:3001` (or `3002` if 3001 is taken).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/nodes` | Get all nodes + edges |
| POST | `/api/nodes` | Create a node |
| PATCH | `/api/nodes/:id` | Update a node |
| DELETE | `/api/nodes/:id` | Soft-delete a node (sets status to removed) |
| POST | `/api/edges` | Create an edge |
| DELETE | `/api/edges/:id` | Delete an edge |

---

## Data

All data lives in `server/data/nodes.json` — a plain JSON file on your machine. It is gitignored so your project data stays local.

---

## License

MIT
