/** Abstracts the REPL's input/output so the loop and its callbacks don't depend on a terminal. */
export interface ReplIO {
  write: (text: string) => void | Promise<void>
  ask: (promptText: string) => Promise<string | null>
}

/** A slash command registered against the REPL, invoked as `/${name}`. */
export interface ReplCommand {
  name: string
  description?: string
  run: (io: ReplIO) => void | Promise<void>
}

/**
 * Configuration for {@link startRepl}.
 *
 * `commands` must include an `exit` entry — exiting is dispatched the same
 * way as every other command, never special-cased in the loop.
 */
export interface ReplOptions {
  prompt: string
  banner: () => string
  commands: ReplCommand[]
  onInput: (input: string, io: ReplIO) => void | Promise<void>
  beforeEach?: (io: ReplIO) => void | Promise<boolean | void>
  onExit?: (io: ReplIO) => void | Promise<void>
}

/** Runs the read-input-dispatch loop shared by every example's REPL. */
export async function startRepl(io: ReplIO, opts: ReplOptions) {
  await io.write(opts.banner())
  const commandMap = new Map(opts.commands.map(c => [`/${c.name}`, c]))
  let exiting = false

  while (!exiting) {
    const userInput = await io.ask(opts.prompt)
    if (userInput === null) break
    const trimmed = userInput.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('/')) {
      const cmd = commandMap.get(trimmed)
      if (!cmd) {
        await io.write(`Unknown command. Available: ${[...commandMap.keys()].join('  ')}`)
        continue
      }
      await cmd.run(io)
      if (cmd.name === 'exit') exiting = true
      continue
    }

    const proceed = opts.beforeEach ? await opts.beforeEach(io) : true
    if (proceed === false) continue
    try {
      await opts.onInput(trimmed, io)
    } catch (e) {
      // One failed turn (model/network/tool error) must not end the session.
      await io.write(`Request failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  await opts.onExit?.(io)
}