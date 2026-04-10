import type { AppState } from '../../state/AppState.js'
import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import type { AgentId } from '../../types/ids.js'
import { updateTaskState } from '../../utils/task/framework.js'

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp'
  agentId?: AgentId
  abortController?: AbortController
  summary?: string
}

export function isMonitorMcpTask(task: unknown): task is MonitorMcpTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'monitor_mcp'
  )
}

export function killMonitorMcp(taskId: string, setAppState: SetAppState): void {
  updateTaskState<MonitorMcpTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running' && task.status !== 'pending') {
      return task
    }

    task.abortController?.abort()

    return {
      ...task,
      status: 'killed',
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
    }
  })
}

export function killMonitorMcpTasksForAgent(
  agentId: AgentId,
  getAppState: () => AppState,
  setAppState: SetAppState,
): void {
  for (const task of Object.values(getAppState().tasks ?? {})) {
    if (
      isMonitorMcpTask(task) &&
      task.agentId === agentId &&
      (task.status === 'running' || task.status === 'pending')
    ) {
      killMonitorMcp(task.id, setAppState)
    }
  }
}

export const MonitorMcpTask: Task = {
  name: 'MonitorMcpTask',
  type: 'monitor_mcp',
  async kill(taskId, setAppState) {
    killMonitorMcp(taskId, setAppState)
  },
}
