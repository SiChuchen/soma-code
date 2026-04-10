type KnownQuerySource =
  | 'repl_main_thread'
  | `repl_main_thread:${string}`
  | 'sdk'
  | 'compact'
  | 'session_memory'
  | 'hook_agent'
  | 'hook_prompt'
  | 'verification_agent'
  | 'agent:default'
  | 'agent:custom'
  | `agent:${string}`
  | 'auto_mode'
  | 'side_question'

/**
 * Recovery type for analytics / cache tracking query sources.
 *
 * The snapshot references a wide and evolving string surface, including
 * feature-gated sources and template-style agent / REPL variants. Keep the
 * known high-signal literals while still allowing snapshot-local extensions.
 */
export type QuerySource = KnownQuerySource | (string & {})
