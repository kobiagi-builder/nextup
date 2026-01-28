/**
 * Response Delay Utilities
 *
 * Simulates realistic API latency for mock responses.
 * Provides variable delays to mimic real API behavior.
 */

/**
 * Simulate a random delay between min and max milliseconds
 *
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export async function simulateDelay(minMs: number, maxMs: number): Promise<number> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

/**
 * Simulate delay based on content size
 *
 * Larger content = longer processing time, mimicking real AI behavior
 * where token generation takes time proportional to output size.
 *
 * @param contentLength - Length of content in characters
 * @param baseMinMs - Base minimum delay
 * @param baseMaxMs - Base maximum delay
 * @param msPerKChar - Additional milliseconds per 1000 characters
 * @returns Actual delay applied
 */
export async function simulateDelayByContentSize(
  contentLength: number,
  baseMinMs: number = 500,
  baseMaxMs: number = 2000,
  msPerKChar: number = 100
): Promise<number> {
  const additionalDelay = Math.floor(contentLength / 1000) * msPerKChar;
  const minMs = baseMinMs + additionalDelay;
  const maxMs = baseMaxMs + additionalDelay;

  return simulateDelay(minMs, maxMs);
}

/**
 * Simulate delay based on operation complexity
 *
 * Different AI operations have different typical response times:
 * - simple: Quick operations (e.g., classification)
 * - moderate: Standard operations (e.g., content section)
 * - complex: Complex operations (e.g., full document, analysis)
 */
export async function simulateDelayByComplexity(
  complexity: 'simple' | 'moderate' | 'complex'
): Promise<number> {
  const delays: Record<typeof complexity, { min: number; max: number }> = {
    simple: { min: 300, max: 800 },
    moderate: { min: 800, max: 2000 },
    complex: { min: 1500, max: 4000 },
  };

  const { min, max } = delays[complexity];
  return simulateDelay(min, max);
}

/**
 * No-op delay for testing (instant return)
 */
export async function noDelay(): Promise<number> {
  return 0;
}
