import { describe, it, expect } from "vitest"
import { findMarkdownTables, hasMarkdownTable, splitTextAndTables } from "./markdown-table.js"

describe("markdown-table", () => {
  describe("findMarkdownTables", () => {
    it("finds a simple GFM table", () => {
      const text = `
| Name | Type |
|------|------|
| John | User |
| Jane | Admin |
`
      const tables = findMarkdownTables(text)
      expect(tables).toHaveLength(1)
      expect(tables[0]).toEqual({
        columns: [
          { name: "Name", width: 200 },
          { name: "Type", width: 200 },
        ],
        rows: [
          [
            { tag: "text", text: { tag: "plain_text", content: "John" } },
            { tag: "text", text: { tag: "plain_text", content: "User" } },
          ],
          [
            { tag: "text", text: { tag: "plain_text", content: "Jane" } },
            { tag: "text", text: { tag: "plain_text", content: "Admin" } },
          ],
        ],
      })
    })

    it("finds a table with alignment colons in separator", () => {
      const text = `
| Left | Center | Right |
|:-----|:------:|------:|
| a    |   b    |     c |
`
      const tables = findMarkdownTables(text)
      expect(tables).toHaveLength(1)
      expect(tables[0].columns).toHaveLength(3)
      expect(tables[0].rows).toHaveLength(1)
    })

    it("finds multiple tables in text", () => {
      const text = `
## First table
| A | B |
|---|---|
| 1 | 2 |

## Second table
| X | Y |
|---|---|
| a | b |
`
      const tables = findMarkdownTables(text)
      expect(tables).toHaveLength(2)
    })

    it("returns empty array for text without tables", () => {
      const text = "Just some plain text with no tables."
      expect(findMarkdownTables(text)).toEqual([])
    })

    it("returns empty array for text with only a header row", () => {
      const text = `
| Name | Type |
|------|------|
`
      expect(findMarkdownTables(text)).toEqual([])
    })

    it("handles real-world insurance data table", () => {
      const text = `
| 协议 | 关键配置 |
|------|------|
| calculationOrder | DISCOUNT = EXTRA_PREMIUM + NO_CLAIM_DISCOUNT |
| conditionalAwAgreement | 覆盖险种: YES, 保费: YES, 监管税: YES, 额外附加: NO |
| effectiveDateRule | 周期: 12, 不启用固定时间 |
`
      const tables = findMarkdownTables(text)
      expect(tables).toHaveLength(1)
      expect(tables[0].columns).toEqual([
        { name: "协议", width: 200 },
        { name: "关键配置", width: 200 },
      ])
      expect(tables[0].rows).toHaveLength(3)
    })

    it("ignores separator-like lines that aren't in a table context", () => {
      const text = `
Some text here.
---
More text here.
`
      expect(findMarkdownTables(text)).toEqual([])
    })

    it("handles trailing whitespace in cells", () => {
      const text = `
| Name  | Value  |
|-------|--------|
| foo   | bar    |
`
      const tables = findMarkdownTables(text)
      expect(tables[0].rows[0]).toEqual([
        { tag: "text", text: { tag: "plain_text", content: "foo" } },
        { tag: "text", text: { tag: "plain_text", content: "bar" } },
      ])
    })

    it("handles tables with empty cells", () => {
      const text = `
| A | B | C |
|---|---|---|
| 1 |   | 3 |
`
      const tables = findMarkdownTables(text)
      expect(tables).toHaveLength(1)
      expect(tables[0].rows).toHaveLength(1)
      expect(tables[0].rows[0]).toHaveLength(3)
    })
  })

  describe("hasMarkdownTable", () => {
    it("returns true for text containing a table", () => {
      const text = `
| Name | Type |
|------|------|
| John | User |
`
      expect(hasMarkdownTable(text)).toBe(true)
    })

    it("returns false for plain text", () => {
      expect(hasMarkdownTable("Just plain text.")).toBe(false)
    })

    it("returns false for separator without pipe characters", () => {
      expect(hasMarkdownTable("Some text\n---\nMore text")).toBe(false)
    })

    it("returns true for table with alignment syntax", () => {
      const text = `| A | B |\n|:---:|:---:|\n| 1 | 2 |`
      expect(hasMarkdownTable(text)).toBe(true)
    })

    it("returns false for table syntax inside fenced code blocks", () => {
      const text = "```md\n| A | B |\n|---|---|\n| 1 | 2 |\n```"
      expect(hasMarkdownTable(text)).toBe(false)
    })
  })

  describe("splitTextAndTables", () => {
    it("returns text segment for plain text without tables", () => {
      const segments = splitTextAndTables("Just plain text.")
      expect(segments).toEqual([{ type: "text", content: "Just plain text." }])
    })

    it("returns single table segment for text with only a table", () => {
      const text = `| Name | Type |
|------|------|
| John | User |`
      const segments = splitTextAndTables(text)
      expect(segments).toHaveLength(1)
      expect(segments[0]!.type).toBe("table")
    })

    it("splits text with table in the middle", () => {
      const text = `## Basic Info
| Name | Value |
|------|-------|
| foo  | bar   |

## Next section
Some text after.`
      const segments = splitTextAndTables(text)
      expect(segments).toHaveLength(3)
      expect(segments[0]!.type).toBe("text")
      expect(segments[1]!.type).toBe("table")
      expect(segments[2]!.type).toBe("text")
    })

    it("preserves markdown formatting in text segments", () => {
      const text = `## Heading
| A | B |
|---|---|
| 1 | 2 |`
      const segments = splitTextAndTables(text)
      expect(segments[0]!.type).toBe("text")
      expect(segments[0]).toEqual({ type: "text", content: "## Heading" })
    })

    it("handles multiple tables with text between them", () => {
      const text = `First table:
| A | B |
|---|---|
| 1 | 2 |

Text between.

Second table:
| X | Y |
|---|---|
| a | b |
End.`
      const segments = splitTextAndTables(text)
      expect(segments).toHaveLength(5)
      expect(segments[0]!.type).toBe("text")
      expect(segments[1]!.type).toBe("table")
      expect(segments[2]!.type).toBe("text")
      expect(segments[3]!.type).toBe("table")
      expect(segments[4]!.type).toBe("text")
    })

    it("handles real-world response with multiple tables", () => {
      const text = `# Liability 配置 (共 18 个)

| liabilityCode | liabilityName |
|---------------|--------------|
| 1002 | Accidental Death |
| 1001 | Accidental Permanent Disability |

Some text between.

| code | name | category |
|------|------|----------|
| 1 | A | X |
| 2 | B | Y |
Done.`
      const segments = splitTextAndTables(text)
      expect(segments).toHaveLength(5)
      expect((segments[1] as any).data.columns).toHaveLength(2)
      expect((segments[3] as any).data.columns).toHaveLength(3)
    })

    it("keeps fenced table examples as text", () => {
      const text = "Before\n```md\n| A | B |\n|---|---|\n| 1 | 2 |\n```\nAfter"
      expect(splitTextAndTables(text)).toEqual([{ type: "text", content: text }])
    })
  })
})
