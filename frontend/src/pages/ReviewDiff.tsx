import React, { useEffect, useState } from "react"

type DiffItem = {
  kind: string
  type?: string
  key?: { from?: string; to?: string }
  from_node?: { uid?: string; name?: string }
  to_node?: { uid?: string; name?: string }
  before?: any
  after?: any
  evidence?: any
  evidence_chunk?: any
}

async function fetchDiff(proposalId: string): Promise<{ items: DiffItem[] }> {
  const res = await fetch(`/v1/proposals/${proposalId}/diff`)
  if (!res.ok) throw new Error("failed to fetch diff")
  return res.json()
}

export function ReviewDiff({ proposalId }: { proposalId: string }) {
  const [items, setItems] = useState<DiffItem[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetchDiff(proposalId)
      .then(d => setItems(d.items || []))
      .catch(e => setError(String(e)))
  }, [proposalId])
  if (error) return React.createElement("div", null, `Error: ${error}`)
  return React.createElement(
    "div",
    null,
    items.map((it, idx) =>
      React.createElement(
        "div",
        { key: idx, style: { border: "1px solid #ddd", padding: 8, marginBottom: 8 } },
        React.createElement("div", null, `Kind: ${it.kind}`),
        it.type ? React.createElement("div", null, `Type: ${it.type}`) : null,
        it.from_node ? React.createElement("div", null, `From: ${it.from_node.uid} (${it.from_node.name || ""})`) : null,
        it.to_node ? React.createElement("div", null, `To: ${it.to_node.uid} (${it.to_node.name || ""})`) : null,
        React.createElement("pre", null, JSON.stringify({ before: it.before, after: it.after }, null, 2)),
        it.evidence_chunk ? React.createElement("div", null, `Evidence: ${it.evidence_chunk?.text || ""}`) : null
      )
    )
  )
}
