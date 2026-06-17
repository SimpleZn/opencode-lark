import { describe, expect, it } from "vitest"
import {
  normalizeFeishuMarkdown,
  renderMarkdownCardElements,
} from "./markdown-card-renderer.js"

describe("markdown-card-renderer", () => {
  it("normalizes GFM heading markers for Feishu markdown", () => {
    expect(normalizeFeishuMarkdown("## Basic Info\n### Agreements")).toBe(
      "**Basic Info**\n**Agreements**",
    )
  })

  it("keeps heading-looking content inside fenced code blocks intact", () => {
    const markdown = "```md\n## Example\n```\n## Rendered"
    expect(normalizeFeishuMarkdown(markdown)).toBe(
      "```md\n## Example\n```\n**Rendered**",
    )
  })

  it("renders normalized text around Feishu table elements", () => {
    const elements = renderMarkdownCardElements(`## Basic Info
| Field | Value |
|---|---|
| productId | 1 |

## Agreements`)

    expect(elements).toEqual([
      { tag: "markdown", content: "**Basic Info**" },
      expect.objectContaining({ tag: "table" }),
      { tag: "markdown", content: "**Agreements**" },
    ])
  })
})
