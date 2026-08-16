# MathMap — status

_Last updated: 2026-08-16_
_Location on disk: `/home/emidude/projects/mathmap/`_
_Repo: **not under git yet — no commits, no remote.** All state is on disk only._

## What it is

A **local browser-based knowledge graph for mathematics**, designed as a personal learning tool for category theory (and to revisit topology, analysis, and everything else that's rusted since undergrad). Nodes are mathematical objects (definitions, theorems, lemmas, proofs, questions, notes, real-world intuition). Edges are *typed* relationships (`depends_on`, `generalizes`, `example_of`, `contradicts`, `analogous_to`, `proof_step`) — so the graph is *queryable structure*, not just visual arrangement.

Two audiences under one skin:

- **Notes tool** — a Miro/Obsidian-canvas-style workspace where each node holds LaTeX-rendered content, optional hand-drawn figures (Apple Pencil on iPad), tags, references.
- **Structural reasoning tool** — because edges carry types, later features can compute dependency graphs, follow proof chains, cluster concepts, or even flag "missing lemma" candidates.

The deeper conceit — spelled out in `the_dream` — is that mathematics itself is already a category: definitions = objects, proofs = morphisms, composition = path concatenation. The UI is described as a *visualization functor* translating math into pictures. Emily's stated goal: "the option to hand draw images directly in nodes with the apple pencil" and "see the connections between different fields... potentially a proof generator or at the very least visualising connections."

## Provenance and attempt history

- **Started in ChatGPT**, not Claude. `original_prompt` and `the_dream` both read distinctly like ChatGPT ("There's a lovely idea hiding in this... 🌿", explicit `Mechanism:` / `Failure mode:` labelled sections).
- Emily's memory: **two attempts with browser glitches** in both. Only one attempt is visible on disk in `mathmap/mathmap/` (all files stamped Mar 17 2026). The second may have been overwritten or never saved.
- No git anywhere, no history to consult. Whatever's on disk is authoritative.
- Notes files at root (`original_prompt`, `the_dream`, `cool_features`, `a_fun_expmnt_when_running`, `example_data_file`, `structure`, `project_structure`, `node`, `node_metadata`, `edges`, `edge_types`, `objects`) are all fragments of the spec / conversation excerpts, kept for reference. The last-touched file is `original_prompt` (2026-03-17), except `the_dream` which was updated on 2026-06-18.
- `original_prompt` ends with the line: `TODO: try a claude project with these prompts`. So this Claude-Code session is stepping into that TODO for the first time.

## Vision (from `original_prompt` + `the_dream` + `cool_features`)

### Locked architectural choices in the spec

- **Vanilla HTML + CSS + JS** — no framework cathedral. "The software equivalent of using a particle accelerator to toast bread." Optional small libs allowed: **KaTeX** for LaTeX rendering, Cytoscape.js or D3 if needed for graphs (but the on-disk code uses neither and rolls its own).
- **Three-layer architecture:** pure data (JSON) / logic (functions) / UI (SVG for edges + HTML divs for nodes).
- **SVG layer beneath, HTML nodes on top** — edges scale nicely; nodes can contain buttons, text, LaTeX, canvases.
- **Data = graph state, stored as JSON.** `mathgraph.json` on disk + localStorage autosave every few seconds. Export/import JSON for versioning.
- **Infinite canvas illusion** — not an actual infinite canvas, but a big translated `<div>` (`transform: translate(x,y) scale(z)`). Mouse drag → pan; wheel → zoom.
- **File modules:** `index.html`, `style.css`, `app.js`, `data.js`, `render.js`, `nodes.js`, `edges.js`, `editor.js`, `storage.js`, `mathgraph.json`.

### Node model

```
Node = { id, type, title, content, x, y, diagrams, tags, metadata }
```

Node types with colours:
- **Red** — Definitions
- **Blue** — Theorems (with proofs)
- **Turquoise** — Lemmas
- **Light blue** — Other proofs
- **Yellow** — Questions (with answers)
- **Green** — Notes
- **Purple** — Real-world demos / intuition

Extensible: adding a new type is meant to be a one-liner.

### Edge model

```
Edge = { id, from, to, type }
```

Types: `depends_on`, `generalizes`, `example_of`, `contradicts`, `analogous_to`, `proof_step`, ...

### Editing behaviour

- Click empty canvas → new node at that point.
- Pencil icon → editable title + LaTeX-editable content.
- Save button replaces the pencil while editing.
- Inside the content editor: add image / upload file / **draw diagram** on a canvas with pen / eraser / shapes / adjustable size. Must work with mouse, touch, and Apple Pencil (pointer events).
- Each diagram gets a **figure number** so LaTeX `\ref{fig:N}` stays consistent.

### Connections

- Small **connection circles** on each edge of a node.
- Click circle → line follows cursor → click another node's circle to connect.
- Circles regenerate when used; unused circles disappear when connections removed.
- To delete an edge: click one circle → line turns red → click the other to confirm; click elsewhere to cancel.

### Envisioned "cool features" (post-MVP, from `cool_features`)

1. **Queryable maths** — "show all nodes that depend on 'group'" answered by traversal
2. **Simplicial-complex framing** — proof chains as higher-order simplices, edging toward topological data analysis
3. **Visualization functor** — abstract structure → pictures as an explicit translation
4. **Dependency graph mode** — highlight all prerequisites of any node
5. **Proof navigation** — follow lemma chains as edge paths
6. **Concept clustering** — detect densely connected regions automatically
7. **Functor view** — translate structures between algebra / topology / analysis / etc.
8. **Search**
9. **Missing-lemma detector** — if A depends on B and B on C but A doesn't reference C, suggest possible missing lemma. "Your graph becomes a mathematical reasoning assistant."
10. **Graph duality** — render the *line graph* transformation (edges become vertices, adjacencies inherited from shared endpoints).

## Current code state (in `mathmap/mathmap/`)

Nine tiny files, ~5.6KB total — a working sketch, roughly 10–15% of the spec.

| File | Size | What it does | Notes |
|---|---|---|---|
| `index.html` | 721 B | Loads KaTeX CDN, toolbar with Export/Import buttons, `#canvas` with SVG edge layer + HTML node layer, scripts. | KaTeX loaded but **never called** anywhere in the code. |
| `app.js` | 447 B | Wires canvas click → `createNode`, buttons → export/import, calls `render()`, autosaves to localStorage every 3s. | **Bug:** localStorage load runs *after* the initial `render()` — nodes won't show on refresh until a re-render is triggered. |
| `data.js` | 128 B | Declares `Graph = { nodes: [], edges: [] }` and two "template" objects. | **Bug:** the template `node = { id, type, title, ... }` and `edge` blocks use bare identifiers (no assignments) — this is a syntax/reference error. Currently unused so it *may* not throw depending on load order, but it's not right. Delete or comment out. |
| `nodes.js` | 465 B | `createNode(x,y)` pushes a new node with `crypto.randomUUID()`. `makeDraggable(element, node)` sets up drag via `document.onmousemove`. | **Bug:** drag mixes `e.offsetX` (element-relative) with `e2.pageX` (page-relative), producing an offset jump. Worse: `render()` on every mousemove nukes the DOM (`layer.innerHTML=""`) so drag handlers detach mid-drag. This is the "browser glitch" you remember. |
| `edges.js` | 270 B | `startEdge`/`finishEdge` global state for edge creation. Pushes an edge with type `"relation"`. | Only supports one hardcoded edge type; no UI for choosing. |
| `render.js` | 1.7 KB | Renders nodes as divs + edges as SVG lines. Each node gets edit (`prompt()`), delete, and one "port". | **Bug:** `el.onclick = () => finishEdge(node.id)` fires on ANY click within the node — including the edit/delete buttons, which are children with no `stopPropagation`. So clicking edit accidentally tries to complete an edge. **Bug:** click fires after drag → dragging a node accidentally calls `finishEdge`. |
| `storage.js` | 648 B | JSON export via Blob download; import via `<input type=file>` FileReader. | Doesn't validate the imported structure — malformed JSON silently overwrites the graph. |
| `style.css` | 709 B | Dark canvas (`#111`), colour classes for `.definition/.theorem/.lemma/.note/.question`. | Missing types from the spec (light-blue proofs, purple real-world) and a genuine "port" circle for each side of the node. |
| `mathgraph.json` | 528 B | Live test data: 3 unconnected `type: "note"` nodes with titles `"New Node"`, `"fsfs"`, `"New Node"`. | The debris of experimentation. |

**Not implemented at all** (from the spec): LaTeX rendering (KaTeX loaded but unused), diagram drawing canvas, Apple-Pencil pointer-event handling, node type selector, edge type UI, per-edge connection circles that appear/disappear, pan/zoom infinite canvas, `editor.js` (missing entirely), autosave to file, import validation, `crypto.randomUUID` fallback for older Safari.

## Priorities (my recommendation, not authoritative)

1. **Decide the reboot vs patch question.** The current code has three visible bugs (localStorage race, drag/click coordinate mixing + rerender-during-drag, click-through into edge creation) and covers ~15% of the spec. A ChatGPT-style rewrite might land in one sitting; patching in place risks compounding the same architectural mistakes. My lean: **patch the three bugs to make the current prototype demoable on iPad first**, then decide whether to rewrite from the (excellent) `original_prompt` under Claude Code with the whole spec in view.
2. **Put it under git before touching anything.** No history means bugs from these edits are indistinguishable from prior state. `git init` + baseline commit of what's on disk.
3. **Ship a minimum viable canvas on iPad.** Pan/zoom, pointer events (for Pencil), create/move/delete nodes, edges with the connection-circle protocol, KaTeX rendering, localStorage autosave. That's the "feels like Miro/Obsidian on the pencil" moment.
4. **Diagram drawing inside nodes.** Small canvas with pen/eraser using PointerEvents API (Apple Pencil comes through as pointerType `"pen"` with pressure).
5. **Node type + edge type UI.** Small dropdowns; extensibility is more important than colour polish.
6. **Then the interesting features** — dependency-graph mode, missing-lemma detector, functor view. These are the point of the project and where category theory earns its keep. Save until the foundation is solid.

## Loose ends

- **Two-attempt memory vs one-attempt disk state.** Only one attempt visible in `mathmap/mathmap/`. The second attempt was either overwritten or never persisted. If Emily has the ChatGPT conversation logs saved somewhere, worth pulling.
- **No git.** Any recovery of the second attempt would need to come from browser localStorage on the machine that ran it, not from disk history.
- **KaTeX CDN dependency.** The `<script src="cdn.jsdelivr.net/...">` won't work offline (which the spec says it should). Bundle KaTeX locally when the project matures.
- **The `TODO` line at the bottom of `original_prompt`:** *"try a claude project with these prompts"*. That was the next step. This survey is Emily starting to act on it.
- **The nine root-level notes files** are all pieces of the original ChatGPT conversation copy-pasted into separate files. Once the vision is captured in a proper `README.md` or spec doc, these can safely be archived into a `notes/` folder — but only after Emily is sure nothing unique is in any of them.

## Environment / nix notes

- **No `shell.nix`, no `flake.nix`, no `package.json`, no `node_modules`.** By design — the spec is deliberately dependency-free; you open `index.html` in a browser and it runs. Zero build step.
- If features like KaTeX-local-bundling or PWA support get added later, a `shell.nix` becomes appropriate. Not yet.
- No global installs required. Purity trivially preserved.

## For the cowork writeup

**Angle:** MathMap is Emily's *personal-domain* project — the one that pulls her back into pure mathematics under the cover of shipping a tool. The other two projects are outward-facing (a dating game, a civic-tech app); MathMap is inward-facing (organise her own notes, close a decade-old gap with topology and analysis).

**Interesting / pitchable bits:**

- **Category theory as the design language of a UI.** Nodes-as-objects, edges-as-morphisms, the visualization layer explicitly cast as a *functor*. Rare for a personal tool.
- **Structural queryability, not just visual arrangement.** The typed-edge design means the graph will eventually answer "what does this theorem depend on?", not just look nice.
- **Deliberate minimalism.** ~5KB of code today; the entire aspirational system is quoted at ~600 lines. A conscious refusal of framework explosion. Reads well next to the harness-heavy Voxpop project as a "same designer, different discipline" pair.
- **iPad + Apple Pencil as first-class.** A tool that's *for* thinking with a pen, not a keyboard.

**Honest state to convey:** a working proof-of-concept sketch with three visible bugs and ~85% of the vision unimplemented. The spec is far more mature than the code. This is a "seeds planted, awaiting cultivation" project — but the seeds are exceptional.
