import { z } from 'zod'

export const LetterCountResultSchema = z.object({
  letter: z.string().describe('The letter that was counted'),
  word: z.string().describe('The word in which the letter was counted'),
  count: z.number().describe('The number of occurrences of the letter in the word'),
})
export type LetterCountResult = z.infer<typeof LetterCountResultSchema>
