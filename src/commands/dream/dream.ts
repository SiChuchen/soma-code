import type { LocalCommandCall, LocalCommandResult } from '../../types/command.js'
import { executeManualDream } from '../../services/autoDream/autoDream.js'

function usage(): LocalCommandResult {
  return {
    type: 'text',
    value: 'Usage: /dream',
  }
}

function formatStartMessage(sessionsReviewing: number): string {
  if (sessionsReviewing === 0) {
    return [
      'Started dream in background.',
      'No newer sessions were detected since the last consolidation, so it will review the existing memory files directly.',
      'Open /tasks to watch progress.',
    ].join('\n')
  }

  return [
    'Started dream in background.',
    `Reviewing ${sessionsReviewing} ${sessionsReviewing === 1 ? 'session' : 'sessions'}.`,
    'Open /tasks to watch progress.',
  ].join('\n')
}

export const call: LocalCommandCall = async (
  args,
  context,
): Promise<LocalCommandResult> => {
  if (args.trim().length > 0) {
    return usage()
  }

  const result = await executeManualDream(context)
  if (result.status === 'skipped') {
    return {
      type: 'text',
      value: result.reason,
    }
  }

  return {
    type: 'text',
    value: formatStartMessage(result.sessionsReviewing),
  }
}
