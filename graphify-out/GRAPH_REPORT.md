# Graph Report - Droplates  (2026-11-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 168 nodes · 340 edges · 11 communities (6 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11abe557`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Studio Editing and Export
- Static Page Builder
- Agency Template Runtime
- Portfolio Template Runtime
- SaaS Template Runtime
- HTML Annotation Tools

## God Nodes (most connected - your core abstractions)
1. `renderBrand()` - 17 edges
2. `renderElement()` - 15 edges
3. `el()` - 14 edges
4. `change()` - 13 edges
5. `renderAll()` - 10 edges
6. `renderDrafts()` - 10 edges
7. `toast()` - 10 edges
8. `textCtl()` - 9 edges
9. `annotate()` - 9 edges
10. `P` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (11 total, 5 thin omitted)

### Community 0 - "Studio Editing and Export"
Cohesion: 0.15
Nodes (36): applyKit(), change(), chips(), clone(), commit(), crc32(), download(), el() (+28 more)

### Community 1 - "Static Page Builder"
Cohesion: 0.09
Nodes (17): { chromium, devices }, data, { execFileSync }, FREE, fs, os, path, ROOT (+9 more)

### Community 2 - "Agency Template Runtime"
Cohesion: 0.17
Nodes (20): apply(), describe(), enableEditing(), fill(), get(), hex(), inkFor(), innerOf() (+12 more)

### Community 3 - "Portfolio Template Runtime"
Cohesion: 0.17
Nodes (20): apply(), describe(), enableEditing(), fill(), get(), hex(), inkFor(), innerOf() (+12 more)

### Community 4 - "SaaS Template Runtime"
Cohesion: 0.17
Nodes (20): apply(), describe(), enableEditing(), fill(), get(), hex(), inkFor(), innerOf() (+12 more)

### Community 5 - "HTML Annotation Tools"
Cohesion: 0.15
Nodes (7): annotate(), label_of(), classes(), inside(), Node, P, walk()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Studio Editing and Export` be split into smaller, more focused modules?**
  _Cohesion score 0.14518002322880372 - nodes in this community are weakly interconnected._
- **Should `Static Page Builder` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._