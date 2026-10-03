import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";

// stdout is the MCP wire protocol here: never console.log in this process, use console.error.
const server = new McpServer({ name: 'letter-tools', version: '1.0.0' })

server.registerTool(
  'letter_counter',
  {
    description: 'Count occurrences of a specific letter in a word. Performs case-insensitive matching.',
    inputSchema: {
      word: z.string().describe('The input word to search in'),
      letter: z.string().length(1).describe('The specific letter to count (exactly one character)'),
    },
  },
  ({ word, letter }) => {
    const count = [...word.toLowerCase()].filter(c => c === letter.toLowerCase()).length
    return { content: [{ type: 'text', text: `The letter '${letter}' appears ${count} time(s) in '${word}'` }] }
  },
)

await server.connect(new StdioServerTransport())
console.error('letter-tools MCP server running on stdio')
