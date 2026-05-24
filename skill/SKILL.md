---
name: vibe-map
version: 1.0.0
description: |
  Snapshot the current project state into Vibe Map (http://localhost:3002),
  a local mind map tool. Scans the codebase to extract nodes (core app,
  features, tech stack, satellites, pending items) and syncs them via the
  Vibe Map API — POSTing new nodes, PATCHing existing ones.
  Use when asked to "vibe map this", "snapshot to vibe map", "map this project",
  or "update the vibe map".
allowed-tools:
  - Bash
  - Read
  - Glob
triggers:
  - vibe map this
  - snapshot to vibe map
  - map this project
  - update the vibe map
  - vibe-map
---

# /vibe-map — Snapshot project state into Vibe Map

Syncs the current project into the Vibe Map mind map tool running at
http://localhost:3002. Extracts nodes from the codebase, deduplicates
against existing nodes, and POSTs or PATCHes as needed.

---

## Step 1 — Identify the project name

The argument passed after `/vibe-map` is the project name. If none was given:

1. Check `package.json` for the `name` field:
   ```bash
   cat package.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('name',''))" 2>/dev/null || true
   ```
2. If that is empty, use the current directory name:
   ```bash
   basename "$(pwd)"
   ```

Store the result as `PROJECT_NAME`. Use it in every API call.

---

## Step 2 — Analyze the project

Run these scans in parallel to understand what is built.

**Tech stack — dependency files:**
```bash
# package.json deps
if [ -f package.json ]; then
  python3 -c "
import json, sys
d = json.load(open('package.json'))
deps = list(d.get('dependencies', {}).keys()) + list(d.get('devDependencies', {}).keys())
for dep in deps[:30]:
    print(dep)
" 2>/dev/null || true
fi

# requirements.txt
[ -f requirements.txt ] && grep -v '^#' requirements.txt | grep -v '^$' | head -20 || true

# go.mod
[ -f go.mod ] && grep '^require' -A 30 go.mod | grep -v '^require' | grep -v '^)' | awk '{print $1}' | head -20 || true

# Gemfile
[ -f Gemfile ] && grep "^gem " Gemfile | awk -F"'" '{print $2}' | head -20 || true
```

**Top-level structure:**
```bash
ls -1 . | grep -v node_modules | grep -v '.git' | grep -v dist | grep -v build | head -40
```

**README:**
```bash
[ -f README.md ] && head -80 README.md || true
[ -f README ] && head -80 README || true
```

**Satellite / test / staging directories:**
```bash
find . -maxdepth 3 -type d \( -name 'test*' -o -name '*test' -o -name '*spec*' -o -name 'sandbox' -o -name 'staging' -o -name 'scripts' -o -name 'tools' -o -name 'e2e' -o -name '__tests__' \) 2>/dev/null | grep -v node_modules | grep -v .git | head -20
```

**TODO comments (pending work):**
```bash
grep -r 'TODO\|FIXME\|HACK\|XXX\|PENDING\|WIP' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' --include='*.go' --include='*.rb' -l 2>/dev/null | grep -v node_modules | grep -v .git | head -10
grep -r 'TODO\|FIXME\|HACK\|XXX\|PENDING\|WIP' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' --include='*.go' --include='*.rb' 2>/dev/null | grep -v node_modules | grep -v .git | head -30
```

**TODOS.md or open issues file:**
```bash
[ -f TODOS.md ] && cat TODOS.md || true
[ -f TODO.md ] && cat TODO.md || true
[ -f ROADMAP.md ] && head -60 ROADMAP.md || true
```

Read any `CLAUDE.md` file in the project root for additional project context:
```bash
[ -f CLAUDE.md ] && cat CLAUDE.md || true
```

---

## Step 3 — Classify nodes

Using what you found in Step 2, build a list of nodes. Each node has this shape:

```json
{
  "label": "string (short, ≤40 chars)",
  "type": "core|feature|tech|satellite|pending",
  "status": "active",
  "project": "PROJECT_NAME",
  "description": "one sentence, what it is or does",
  "position": { "x": 0, "y": 0 }
}
```

**Type definitions:**
- `core` — the main application itself (one node, named after the project)
- `feature` — a working capability or module (auth, dashboard, API routes, billing, etc.)
- `tech` — a technology, library, or infrastructure piece (React, PostgreSQL, Stripe, etc.)
- `satellite` — a test harness, staging env, sandbox, CLI tool, or validation project
- `pending` — something discussed but not yet built; from TODO comments, TODOS.md, or recent conversation context

**Classification rules:**
- Keep labels tight. "User Authentication" not "The user authentication system".
- Limit tech nodes to the 8-12 most important libraries. Skip test utilities, linters, formatters.
- Limit pending nodes to concrete items with a clear description. Skip vague TODOs.
- Every project gets exactly one `core` node.
- Aim for 10-25 total nodes. More than 30 is noisy; fewer than 5 is useless.

**Position layout — radial by type:**
Assign positions so nodes of the same type cluster together. Use this layout:

```
core     → center: x=600, y=400
feature  → ring at radius ~250: spread evenly around center
tech     → ring at radius ~450: spread evenly around center
satellite→ ring at radius ~350, bottom half
pending  → ring at radius ~350, top half
```

Space formula for N nodes in a ring at radius R, centered at (cx, cy):
```
angle_i = (2 * pi * i) / N
x_i = cx + R * cos(angle_i)
y_i = cy + R * sin(angle_i)
```

Compute positions in your head or use bash:
```bash
python3 -c "
import math
nodes = [
    # ('label', 'type')
    # fill in from your analysis above
]
cx, cy = 600, 400
radii = {'core': 0, 'feature': 250, 'tech': 450, 'satellite': 350, 'pending': 350}
counts = {}
indices = {}
for label, t in nodes:
    counts[t] = counts.get(t, 0) + 1
for label, t in nodes:
    i = indices.get(t, 0)
    R = radii[t]
    if R == 0:
        x, y = cx, cy
    else:
        total = counts[t]
        angle = (2 * math.pi * i) / total
        # offset pending/satellite to top/bottom half
        if t == 'pending':
            angle = angle / 2 - math.pi / 2
        elif t == 'satellite':
            angle = angle / 2 + math.pi / 2
        x = cx + R * math.cos(angle)
        y = cy + R * math.sin(angle)
    print(f'{label}|{t}|{int(x)}|{int(y)}')
    indices[t] = i + 1
"
```

Fill in the actual node list you derived from Step 2 before running.

---

## Step 4 — Sync with Vibe Map API

**4a. Check Vibe Map is reachable:**
```bash
curl -sf http://localhost:3002/api/nodes -o /dev/null && echo "VIBE_MAP_UP" || echo "VIBE_MAP_DOWN"
```

If `VIBE_MAP_DOWN`, stop and report: "Vibe Map is not running at http://localhost:3002. Start it and re-run /vibe-map."

**4b. Fetch existing nodes:**
```bash
curl -sf http://localhost:3002/api/nodes
```

Parse the response. Each existing node has at minimum: `id`, `label`, `project` (or `data.project`), `type`. The exact shape depends on the API — inspect the response and adapt.

Build a lookup: `existing_key = (label.lower(), project.lower())` → `node_id`.

**4c. For each node in your list:**

Check if a node with the same `label` (case-insensitive) and `project` already exists in the fetched list.

- **If it does not exist** — POST:
  ```bash
  curl -sf -X POST http://localhost:3002/api/nodes \
    -H 'Content-Type: application/json' \
    -d '{
      "label": "LABEL",
      "type": "TYPE",
      "status": "active",
      "project": "PROJECT_NAME",
      "description": "DESCRIPTION",
      "position": {"x": X, "y": Y}
    }'
  ```

- **If it exists** — PATCH to update description and type (do not move position if it already has one):
  ```bash
  curl -sf -X PATCH http://localhost:3002/api/nodes/NODE_ID \
    -H 'Content-Type: application/json' \
    -d '{
      "type": "TYPE",
      "description": "DESCRIPTION",
      "status": "active"
    }'
  ```

- **If it exists and nothing changed** — skip it (record as "skipped").

Track three lists as you go:
- `ADDED` — labels of nodes successfully POSTed
- `UPDATED` — labels of nodes successfully PATCHed
- `SKIPPED` — labels of nodes already up to date

**4d. Error handling:**
If a POST or PATCH returns a non-2xx status, print the response body and continue to the next node. Do not abort the whole run for one failed node. Report failures in the summary.

---

## Step 5 — Report

Print a clean summary:

```
VIBE MAP SYNC — PROJECT_NAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Added (N):
  + Node Label — type: tech | "description"
  + Node Label — type: feature | "description"
  ...

Updated (N):
  ~ Node Label — type: feature | "description"
  ...

Skipped (N — already up to date):
  = Node Label
  ...

Errors (N):
  ! Node Label — HTTP 422: <response>
  ...

View: http://localhost:5173
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If zero nodes were added or updated, say: "Nothing new to sync — Vibe Map already reflects the current state of PROJECT_NAME."

---

## Important notes

- The Vibe Map API runs at http://localhost:3002. The UI runs at http://localhost:5173.
- Never create duplicate nodes. Always fetch before writing.
- Positions only matter for new nodes. Do not PATCH positions on existing nodes — the user may have moved them manually.
- Skip `node_modules/`, `.git/`, `dist/`, `build/` in all file scans.
- If the project has no package.json, requirements.txt, or go.mod, infer tech from file extensions found in the repo.
- Keep descriptions to one sentence. They appear as tooltips in the mind map.
- The `project` field is how the mind map groups nodes. Match it exactly to `PROJECT_NAME` on every node.
