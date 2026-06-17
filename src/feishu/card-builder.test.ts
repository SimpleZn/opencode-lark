import { describe, it, expect } from "vitest"
import {
  buildThinkingCard,
  buildResponseCard,
  buildErrorCard,
  buildTableCard,
} from "./card-builder.js"

describe("card-builder", () => {
  describe("buildThinkingCard", () => {
    it("returns a card with lark_md content", () => {
      const card = buildThinkingCard()
      expect(card.config.wide_screen_mode).toBe(true)
      expect(card.header.template).toBe("blue")
      expect(card.elements[0]).toEqual({
        tag: "div",
        text: { tag: "lark_md", content: "正在处理你的消息，请稍候..." },
      })
    })
  })

  describe("buildResponseCard", () => {
    it("returns a card with lark_md content", () => {
      const card = buildResponseCard("**Hello** world")
      expect(card.header.template).toBe("green")
      expect(card.elements[0]).toEqual({
        tag: "div",
        text: { tag: "lark_md", content: "**Hello** world" },
      })
    })

    it("truncates long text to 4000 chars", () => {
      const longText = "a".repeat(5000)
      const card = buildResponseCard(longText)
      const content = (card.elements[0] as any).text.content
      expect(content.length).toBeLessThanOrEqual(4020)
      expect(content).toContain("内容过长，已截断")
    })
  })

  describe("buildErrorCard", () => {
    it("returns a card with error message", () => {
      const card = buildErrorCard("Something broke")
      expect(card.header.template).toBe("red")
      expect(card.elements[0]).toEqual({
        tag: "div",
        text: { tag: "lark_md", content: "Something broke" },
      })
    })

    it("uses default message when msg is empty", () => {
      const card = buildErrorCard("")
      const content = (card.elements[0] as any).text.content
      expect(content).toContain("处理请求时发生错误")
    })
  })

  describe("buildTableCard", () => {
    it("returns a card with table element", () => {
      const card = buildTableCard("Test Table", {
        columns: [{ name: "Name", width: 150 }],
        rows: [
          [
            { tag: "text", text: { tag: "plain_text", content: "Row 1" } },
          ],
        ],
      })

      expect(card.config.wide_screen_mode).toBe(true)
      expect(card.header.title.content).toBe("Test Table")
      expect(card.elements[0]).toEqual({
        tag: "table",
        page_size: 20,
        columns: [
          { name: "column_0", display_name: "Name", data_type: "lark_md" },
        ],
        rows: [{ column_0: "Row 1" }],
      })
    })

    it("maps parsed cells into keyed Feishu table rows", () => {
      const card = buildTableCard("Defaults", {
        columns: [{ name: "A" }, { name: "B" }],
        rows: [
          [
            { tag: "text", text: { tag: "plain_text", content: "a" } },
            { tag: "text", text: { tag: "plain_text", content: "b" } },
          ],
        ],
      })

      const table = card.elements[0] as any
      expect(table.columns).toEqual([
        { name: "column_0", display_name: "A", data_type: "lark_md" },
        { name: "column_1", display_name: "B", data_type: "lark_md" },
      ])
      expect(table.rows).toEqual([{ column_0: "a", column_1: "b" }])
    })

    it("uses custom page_size when specified", () => {
      const card = buildTableCard("Paginated", {
        columns: [{ name: "X" }],
        rows: [],
      }, { pageSize: 5 })

      expect((card.elements[0] as any).page_size).toBe(5)
      const table = card.elements[0] as any
      expect(table.columns).toHaveLength(1)
    })

    it("uses custom template when specified", () => {
      const card = buildTableCard("Styled", {
        columns: [{ name: "X" }],
        rows: [],
      }, { template: "green" })

      expect(card.header.template).toBe("green")
    })
  })
})
