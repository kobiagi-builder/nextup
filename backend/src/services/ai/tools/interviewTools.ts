import { tool } from 'ai';
import { z } from 'zod';
import { getSupabase } from '../../../lib/requestContext.js';
import { logger, logToFile } from '../../../lib/logger.js';

/**
 * Interview Tools for Showcase Content Creation
 *
 * Three tools for the showcase interview flow:
 * - startShowcaseInterview: validates artifact, transitions to interviewing, returns user profile (supports resume)
 * - saveInterviewAnswer: saves a single Q&A pair incrementally after each user answer
 * - completeShowcaseInterview: stores synthesized brief, prepares for research
 *
 * The actual interview conversation is orchestrated by Claude via system prompt instructions.
 * Coverage scoring happens in Claude's reasoning (not as separate tool calls).
 */

// Coverage dimension enum
const DIMENSIONS = [
  'case_context',
  'problem_challenge',
  'approach_methodology',
  'results_outcomes',
  'lessons_insights',
] as const;

// Coverage scores schema (reused in both tools)
const coverageScoresSchema = z.object({
  case_context: z.number().min(0).max(20),
  problem_challenge: z.number().min(0).max(20),
  approach_methodology: z.number().min(0).max(20),
  results_outcomes: z.number().min(0).max(20),
  lessons_insights: z.number().min(0).max(20),
});

export const startShowcaseInterview = tool({
  description: 'Start a showcase interview for an artifact. Call this when a showcase artifact needs content creation. Validates the artifact is a showcase in draft status, transitions to interviewing, and returns user profile context for adaptive questioning.',
  inputSchema: z.object({
    artifactId: z.string().describe('The artifact ID from screenContext'),
  }),
  execute: async ({ artifactId }) => {
    logToFile('TOOL EXECUTED: startShowcaseInterview', { artifactId });

    // 1. Validate artifact exists, is showcase, is in draft status
    const { data: artifact, error: fetchError } = await getSupabase()
      .from('artifacts')
      .select('id, type, status, title, content, metadata')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      return { success: false, error: 'Artifact not found' };
    }

    if (artifact.type !== 'showcase') {
      return { success: false, error: `Interview is only for showcase artifacts. This is a ${artifact.type}.` };
    }

    // Handle resume / double-fire: if already interviewing, fetch existing Q&A pairs for resume
    if (artifact.status === 'interviewing') {
      const { data: userContext } = await getSupabase()
        .from('user_context')
        .select('about_me, profession, customers, goals')
        .limit(1)
        .single();

      const { data: skills } = await getSupabase()
        .from('skills')
        .select('name, category, proficiency, years_experience')
        .order('proficiency', { ascending: false });

      // Fetch existing interview pairs for resume
      const { data: existingPairs } = await getSupabase()
        .from('artifact_interviews')
        .select('question_number, dimension, question, answer, coverage_scores')
        .eq('artifact_id', artifactId)
        .order('question_number', { ascending: true });

      const hasExistingPairs = existingPairs && existingPairs.length > 0;
      const lastScores = hasExistingPairs
        ? existingPairs[existingPairs.length - 1].coverage_scores
        : { case_context: 0, problem_challenge: 0, approach_methodology: 0, results_outcomes: 0, lessons_insights: 0 };

      return {
        success: true,
        alreadyStarted: true,
        isResume: hasExistingPairs,
        existingPairs: existingPairs || [],
        lastCoverageScores: lastScores,
        questionCount: existingPairs?.length || 0,
        artifactTitle: artifact.title,
        userProfile: userContext ? {
          aboutMe: userContext.about_me,
          profession: userContext.profession,
          customers: userContext.customers,
          goals: userContext.goals,
        } : null,
        userSkills: skills?.map(s => ({
          name: s.name,
          category: s.category,
          proficiency: s.proficiency,
          yearsExperience: s.years_experience,
        })) || [],
        instructions: hasExistingPairs
          ? `Resuming interview. ${existingPairs.length} questions already answered. Continue from question ${existingPairs.length + 1}, targeting the lowest coverage dimension.`
          : 'Interview already in progress. Continue asking questions targeting the lowest coverage dimension.',
      };
    }

    if (artifact.status !== 'draft') {
      return { success: false, error: `Artifact must be in draft status to start interview. Current: ${artifact.status}` };
    }

    // 2. Transition to interviewing
    const { error: updateError } = await getSupabase()
      .from('artifacts')
      .update({
        status: 'interviewing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifactId);

    if (updateError) {
      return { success: false, error: `Failed to update status: ${updateError.message}` };
    }

    logger.info('[Artifact status] status changed', {
      previousStatus: 'draft',
      newStatus: 'interviewing',
    });

    // 3. Fetch user profile for adaptive questioning
    const { data: userContext } = await getSupabase()
      .from('user_context')
      .select('about_me, profession, customers, goals')
      .limit(1)
      .single();

    const { data: skills } = await getSupabase()
      .from('skills')
      .select('name, category, proficiency, years_experience')
      .order('proficiency', { ascending: false });

    return {
      success: true,
      statusTransition: { from: 'draft', to: 'interviewing' },
      artifactTitle: artifact.title,
      artifactDescription: artifact.content,
      userProfile: userContext ? {
        aboutMe: userContext.about_me,
        profession: userContext.profession,
        customers: userContext.customers,
        goals: userContext.goals,
      } : null,
      userSkills: skills?.map(s => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsExperience: s.years_experience,
      })) || [],
      initialCoverageScores: {
        case_context: 0,
        problem_challenge: 0,
        approach_methodology: 0,
        results_outcomes: 0,
        lessons_insights: 0,
      },
      instructions: 'Interview started. Ask the first question targeting the lowest coverage dimension. Use the user profile to ask adaptive, targeted questions.',
    };
  },
});

export const saveInterviewAnswer = tool({
  description: 'Save a single interview Q&A pair to the database. Call this after each user answer during a showcase interview. This enables resume if the user leaves mid-interview.',
  inputSchema: z.object({
    artifactId: z.string().describe('The artifact ID'),
    questionNumber: z.number().describe('Sequential question number (1-based)'),
    dimension: z.enum(DIMENSIONS).describe('The coverage dimension this question targeted'),
    question: z.string().describe('The question that was asked'),
    answer: z.string().describe('The user answer'),
    coverageScores: coverageScoresSchema.describe('Updated coverage scores after this answer'),
  }),
  execute: async ({ artifactId, questionNumber, dimension, question, answer, coverageScores }) => {
    logToFile('TOOL EXECUTED: saveInterviewAnswer', { artifactId, questionNumber, dimension });

    const { error } = await getSupabase()
      .from('artifact_interviews')
      .upsert({
        artifact_id: artifactId,
        question_number: questionNumber,
        dimension,
        question,
        answer,
        coverage_scores: coverageScores,
      }, {
        onConflict: 'artifact_id,question_number',
      });

    if (error) {
      logger.error('[saveInterviewAnswer] Failed to save', { error: error.message });
      return { success: false, error: error.message };
    }

    const totalScore = Object.values(coverageScores).reduce((a, b) => a + b, 0);

    return {
      success: true,
      questionNumber,
      totalCoverageScore: totalScore,
      readyToComplete: totalScore >= 95,
    };
  },
});

export const completeShowcaseInterview = tool({
  description: 'Complete a showcase interview. Call this after coverage score reaches >=95 and the user confirms the summary. Saves all Q&A pairs, synthesizes the author brief, and stores it for the research phase.',
  inputSchema: z.object({
    artifactId: z.string().describe('The artifact ID'),
    interviewPairs: z.array(z.object({
      questionNumber: z.number(),
      dimension: z.enum(DIMENSIONS),
      question: z.string(),
      answer: z.string(),
    })).min(1).describe('All Q&A pairs from the interview'),
    coverageScores: coverageScoresSchema.describe('Final coverage scores'),
    synthesizedBrief: z.string().describe('The comprehensive brief synthesized from all answers. This becomes the author_brief for the research phase.'),
  }),
  execute: async ({ artifactId, interviewPairs, coverageScores, synthesizedBrief }) => {
    logToFile('TOOL EXECUTED: completeShowcaseInterview', {
      artifactId,
      pairCount: interviewPairs.length,
      totalScore: Object.values(coverageScores).reduce((a, b) => a + b, 0),
    });

    // 1. Validate artifact is in interviewing status
    const { data: artifact, error: fetchError } = await getSupabase()
      .from('artifacts')
      .select('id, status, title')
      .eq('id', artifactId)
      .single();

    if (fetchError || !artifact) {
      return { success: false, error: 'Artifact not found' };
    }

    if (artifact.status !== 'interviewing') {
      return { success: false, error: `Expected interviewing status, got: ${artifact.status}` };
    }

    // 2. Upsert all Q&A pairs (fills gaps from any missed saveInterviewAnswer calls)
    if (interviewPairs.length > 0) {
      const rows = interviewPairs.map(pair => ({
        artifact_id: artifactId,
        question_number: pair.questionNumber,
        dimension: pair.dimension,
        question: pair.question,
        answer: pair.answer,
        coverage_scores: coverageScores,
      }));

      const { error: insertError } = await getSupabase()
        .from('artifact_interviews')
        .upsert(rows, { onConflict: 'artifact_id,question_number' });

      if (insertError) {
        logger.error('[completeShowcaseInterview] Failed to save interview pairs', {
          error: insertError.message,
        });
        return { success: false, error: `Failed to save interview data: ${insertError.message}` };
      }
    }

    // 3. Store synthesized brief in artifacts.metadata.author_brief
    const { data: currentArtifact } = await getSupabase()
      .from('artifacts')
      .select('metadata')
      .eq('id', artifactId)
      .single();

    const updatedMetadata = {
      ...((currentArtifact?.metadata as Record<string, unknown>) || {}),
      author_brief: synthesizedBrief,
      interview_completed: true,
      interview_coverage_scores: coverageScores,
      interview_question_count: interviewPairs.length,
    };

    const { error: updateError } = await getSupabase()
      .from('artifacts')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', artifactId);

    if (updateError) {
      return { success: false, error: `Failed to update artifact metadata: ${updateError.message}` };
    }

    logger.info('[completeShowcaseInterview] Interview completed', {
      questionCount: interviewPairs.length,
      totalScore: Object.values(coverageScores).reduce((a, b) => a + b, 0),
    });

    // NOTE: Status stays as 'interviewing' here.
    // conductDeepResearch will transition from 'interviewing' -> 'research'

    return {
      success: true,
      briefSaved: true,
      questionCount: interviewPairs.length,
      totalCoverageScore: Object.values(coverageScores).reduce((a, b) => a + b, 0),
      instructions: 'Interview data saved. Now call conductDeepResearch with the artifactId to begin the research phase. The synthesized brief is already stored as author_brief.',
    };
  },
});
