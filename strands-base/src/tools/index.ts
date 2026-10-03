import {letterCounter} from "./letter_counter.ts";

/** In-process tools. MCP-served tools are loaded separately, since they need a connection lifecycle. */
export const localTools = [letterCounter]
