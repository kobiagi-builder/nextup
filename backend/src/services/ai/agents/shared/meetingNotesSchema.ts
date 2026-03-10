/**
 * Shared Zod schema for meeting notes analysis tools.
 * Used by both Customer Management and Product Management agent tools.
 */

import { z } from 'zod'

export const meetingNotesInputSchema = z.object({
  initiativeId: z.string().uuid().optional().describe('The initiative this meeting relates to. If omitted, the tool will auto-select the most relevant active initiative.'),
  title: z
    .string()
    .describe('Meeting title, e.g. "Sprint Planning - March 10" or "Discovery Call with Acme"'),
  content: z
    .string()
    .describe(
      'Full Markdown meeting analysis. Include all applicable sections from the analysis framework. Aim for 1500-3000 words depending on meeting complexity.',
    ),
  meetingType: z
    .enum([
      'status',
      'discovery',
      'sprint_planning',
      'roadmap_review',
      'user_interview',
      'pricing',
      'kickoff',
      'retrospective',
      'design_review',
      'introduction',
      'account_review',
      'demo',
      'feedback',
      'other',
    ])
    .describe('Type of meeting'),
  attendees: z
    .array(z.string())
    .optional()
    .describe('Names of attendees mentioned in the notes'),
  meetingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('ISO date of the meeting (YYYY-MM-DD) if mentioned'),
  actionItemsSummary: z
    .array(
      z.object({
        description: z.string().describe('What needs to be done'),
        owner: z.string().optional().describe('Person responsible'),
        dueDate: z.string().optional().describe('Deadline if stated (YYYY-MM-DD)'),
      }),
    )
    .optional()
    .describe(
      'Structured list of action items extracted from the meeting. Used for follow-up creation via createActionItem tool.',
    ),
})

export type MeetingNotesInput = z.infer<typeof meetingNotesInputSchema>
