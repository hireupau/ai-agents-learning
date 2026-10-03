import {resolveAgentType} from "./providers.ts";
import {createPipeline} from "./pipeline.ts";
import {startRepl} from "./console/repl.ts";
import {consoleIO} from "./console/console_io.ts";

const pipeline = createPipeline(resolveAgentType(process.argv.slice(2)));

await startRepl(consoleIO, {
  prompt: '\nAsk the agent to count a letter in a word (e.g. "how many R\'s in Strawberry?"), or /exit to quit: ',
  banner: () => '',
  commands: [{ name: 'exit', run: () => {} }],
  onInput: async (input, io) => {
    const result = await pipeline.run(input)
    if (!result.ok) return io.write(result.error)
    await io.write(result.value.message)
  },
  onExit: () => pipeline.close(),
})
