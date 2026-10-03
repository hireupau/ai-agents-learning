import type { ReplIO } from './repl.ts'

/** The terminal-backed ReplIO used by every example today. */
export const consoleIO: ReplIO = {
  write: text => { console.log(text) },
  ask: promptText => Promise.resolve(prompt(promptText)),
}