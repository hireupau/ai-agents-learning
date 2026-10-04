import { z } from 'zod'

export const LetterCountResultSchema = z.object({
  letter: z.string().describe('The letter that was counted'),
  word: z.string().describe('The word in which the letter was counted'),
  count: z.number().describe('The number of occurrences of the letter in the word'),
})
export type LetterCountResult = z.infer<typeof LetterCountResultSchema>

/**
 * What the counting agent returns. Exactly one of the two fields is set: `result` for a valid letter-count
 * request, `refusal` (a short reason) for anything else. Kept as one object because tool input schemas
 * must be a top-level object, so a bare union is not safe across providers.
 */
export const CountingOutputSchema = z.object({
  result: LetterCountResultSchema.optional().describe('Set only when the request was a valid letter count'),
  refusal: z.string().optional().describe('Set only when the request is not about counting a letter in a word; a short reason'),
})

export const StructuredOutputSchema = z.object({
  message: z.string().describe('The output message'),
})
export type StructuredOutput = z.infer<typeof StructuredOutputSchema>