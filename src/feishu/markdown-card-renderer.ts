import { buildMessageTableElement } from "./card-builder.js"
import { splitTextAndTables } from "../utils/markdown-table.js"

/**
 * Render response Markdown into Feishu card elements.
 * Feishu markdown supports inline formatting, but not all GFM block syntax.
 */
export function renderMarkdownCardElements(
  markdown: string,
): Record<string, unknown>[] {
  return splitTextAndTables(markdown).flatMap((segment) => {
    if (segment.type === "table") {
      return [buildMessageTableElement(segment.data)]
    }

    const content = normalizeFeishuMarkdown(segment.content)
    return content.trim()
      ? [{ tag: "markdown", content }]
      : []
  })
}

export function normalizeFeishuMarkdown(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let fenced = false

  return lines
    .map((line) => {
      if (isFenceLine(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) {
        return line
      }

      const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)
      return heading ? `**${heading[1]}**` : line
    })
    .join("\n")
}

function isFenceLine(line: string): boolean {
  return /^\s{0,3}(```|~~~)/.test(line)
}
