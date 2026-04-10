export const DISCOVERY_SIGNALS = [
  'turn_zero_user_input',
  'inter_turn_write_pivot',
  'subagent_spawn',
  'assistant_turn',
] as const

export type DiscoverySignal = (typeof DISCOVERY_SIGNALS)[number]
