/**
 * Parse GitHub Flavored Markdown (GFM) tables from text.
 * Detects tables delimited by separator rows like `|---|---|`.
 *
 * Returns an array of parsed tables, each with columns and rows
 * suitable for Feishu card `table` element content.
 */

import type { CardTableData } from "../feishu/cardkit-client.js"

/**
 * Result of splitting text around markdown tables.
 * Each segment is either plain text or a parsed table.
 */
export type TextSegment =
  | { type: "text"; content: string }
  | { type: "table"; data: CardTableData }

/**
 * Match result for a single table within text.
 */
interface TableMatch {
  startLine: number
  endLine: number
  data: CardTableData
}

/**
 * Split text into segments: plain text and markdown tables.
 * Returns an array of { type: "text", content } and { type: "table", data }.
 */
export function splitTextAndTables(text: string): TextSegment[] {
  const lines = text.split(/\r?\n/)
  const segments: TextSegment[] = []
  let textBuffer = ""

  // First pass: find all table line ranges
  const tableRanges: TableMatch[] = []
  let fenced = false
  for (let i = 1; i < lines.length; i++) {
    if (isFenceLine(lines[i - 1] ?? "")) {
      fenced = !fenced
    }
    if (fenced) continue

    const line = lines[i]!.trim()
    if (!/^[\s|:-]+$/.test(line) || !line.includes("-") || !line.includes("|")) continue
    const headerLine = lines[i - 1]?.trim()
    if (!headerLine?.startsWith("|")) continue
    const headerParts = headerLine.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    if (headerParts.length < 1) continue
    const sepParts = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    if (sepParts.length !== headerParts.length) continue
    if (!sepParts.every((s) => /^:?-+:?$/.test(s.trim()))) continue

    // Collect body rows
    const bodyRows: string[][] = []
    let j = i + 1
    for (; j < lines.length; j++) {
      const bodyLine = lines[j]!.trim()
      if (!bodyLine.startsWith("|")) break
      const parts = bodyLine.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      if (parts.length !== headerParts.length) break
      bodyRows.push(parts.map((p) => p.trim()))
    }
    if (bodyRows.length === 0) continue
    const hasData = bodyRows.some((row) => row.some((cell) => cell.length > 0))
    if (!hasData) continue

    tableRanges.push({
      startLine: i - 1,
      endLine: j - 1,
      data: {
        columns: headerParts.map((name) => ({ name: name.trim(), width: 200 })),
        rows: bodyRows.map((row) =>
          row.map((cell) => ({
            tag: "text",
            text: { tag: "plain_text", content: cell },
          })),
        ),
      },
    })
    i = j - 1
  }

  // Second pass: build segments
  let tableIdx = 0
  for (let i = 0; i < lines.length; i++) {
    const range = tableRanges[tableIdx]
    if (range && i === range.startLine) {
      // Flush text buffer
      if (textBuffer.length > 0) {
        segments.push({ type: "text", content: textBuffer })
        textBuffer = ""
      }
      // Add table
      segments.push({ type: "table", data: range.data })
      tableIdx++
      i = range.endLine
    } else {
      textBuffer += (textBuffer ? "\n" : "") + lines[i]
    }
  }

  if (textBuffer.length > 0) {
    segments.push({ type: "text", content: textBuffer })
  }

  return segments
}

/**
 * Find all GFM tables in the given text.
 */
export function findMarkdownTables(text: string): CardTableData[] {
  return splitTextAndTables(text)
    .filter((s): s is { type: "table"; data: CardTableData } => s.type === "table")
    .map((s) => s.data)
}

/**
 * Check if text contains at least one GFM table.
 * Faster than `findMarkdownTables` when you only need a yes/no.
 */
export function hasMarkdownTable(text: string): boolean {
  const lines = text.split(/\r?\n/)
  let fenced = false
  for (let i = 1; i < lines.length; i++) {
    if (isFenceLine(lines[i - 1] ?? "")) {
      fenced = !fenced
    }
    if (fenced) continue

    const line = lines[i]!.trim()
    if (!/^[\s|:-]+$/.test(line) || !line.includes("-") || !line.includes("|")) continue
    const headerLine = lines[i - 1]?.trim()
    if (!headerLine?.startsWith("|")) continue
    return true
  }
  return false
}

function isFenceLine(line: string): boolean {
  return /^\s{0,3}(```|~~~)/.test(line)
}
