/**
 * Tests for Message Formatter
 */

import { describe, it, expect } from 'vitest'
import { parseMessageSegments } from './messageFormatter'

describe('parseMessageSegments', () => {
  it('splits messages at segment boundaries', () => {
    const input = "I'll create that content for you.Let me try to complete the content creation by writing the sections manually based on the research and skeleton."

    const segments = parseMessageSegments(input)

    expect(segments).toHaveLength(2)
    expect(segments[0].text).toContain("I'll create that content for you")
    expect(segments[1].text).toContain("Let me try to complete")
  })

  it('formats long message with proper line spacing', () => {
    const input = "Perfect! I've successfully created your LinkedIn post \"5 AI Productivity Tips for 2026\" with comprehensive research and human-refined content. The post is now ready for publishing and includes practical, actionable tips based on current AI productivity trends going into 2026."

    const segments = parseMessageSegments(input)

    expect(segments).toHaveLength(1)
    expect(segments[0].type).toBe('result')

    // Should have line breaks between sentences
    expect(segments[0].text).toContain('\n')
  })

  it('detects action segments', () => {
    const input = "I'll start by analyzing the data. Let me process this information."

    const segments = parseMessageSegments(input)

    expect(segments[0].type).toBe('action')
    expect(segments[1].type).toBe('action')
  })

  it('detects result segments', () => {
    const input = "Perfect! The task has been completed successfully."

    const segments = parseMessageSegments(input)

    expect(segments[0].type).toBe('result')
  })

  it('handles empty content', () => {
    const segments = parseMessageSegments('')
    expect(segments).toHaveLength(0)
  })

  it('handles single sentence', () => {
    const input = "This is a single sentence."

    const segments = parseMessageSegments(input)

    expect(segments).toHaveLength(1)
    expect(segments[0].text).toBe("This is a single sentence.")
  })

  it('preserves content without adding extra breaks', () => {
    const input = "Here's what I found."

    const segments = parseMessageSegments(input)

    expect(segments).toHaveLength(1)
    // Should not have extra newlines for short content
    expect(segments[0].text).toBe("Here's what I found.")
  })
})
