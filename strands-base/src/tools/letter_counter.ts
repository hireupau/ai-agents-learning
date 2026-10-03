import {z} from "zod";
import {tool} from "@strands-agents/sdk";

export const LetterInputSchema = z.object({
  word: z.string().describe('The input word to search in'),
  letter: z.string().length(1).describe('The specific letter to count (exactly one character)'),
})

export const letterCounter = tool({
  name: 'letter_counter',
  description: 'Count occurrences of a specific letter in a word. Performs case-insensitive matching.',
  inputSchema: LetterInputSchema,
  callback: (input) => {
    const { word, letter } = input
    const lowerWord = word.toLowerCase()
    const lowerLetter = letter.toLowerCase()

    let count = 0
    for (const char of lowerWord) {
      if (char === lowerLetter) {
        count++
      }
    }
    return `The letter '${letter}' appears ${count} time(s) in '${word}'`
  }
})