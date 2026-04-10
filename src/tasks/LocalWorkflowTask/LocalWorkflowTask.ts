import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import type { AgentId } from '../../types/ids.js'
import { updateTaskState } from '../../utils/task/framework.js'

export type LocalWorkflowAgentState = {
  agentId: AgentId
  label: string
  status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'skipped'
    | 'retrying'
    | (string & {})
  summary?: string
  error?: string
}

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  workflowName?: string
  summary?: string
  agentCount: number
  agentStates?: LocalWorkflowAgentState[]
  abortController?: AbortController
  agentControllers?: Map<AgentId, AbortController>
  isBackgrounded?: boolean
}

export function isLocalWorkflowTask(task: unknown): task is LocalWorkflowTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'local_workflow'
  )
}

function getAgentControllers(
  task: LocalWorkflowTaskState,
): Map<AgentId, AbortController> {
  return task.agentControllers ?? new Map()
}

export function killWorkflowTask(taskId: string, setAppState: SetAppState): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running' && task.status !== 'pending') {
      return task
    }

    task.abortController?.abort()
    for (const controller of getAgentControllers(task).values()) {
      controller.abort()
    }

    return {
      ...task,
      status: 'killed',
      endTime: Date.now(),
      notified: true,
      abortController: undefined,
      agentControllers: new Map(),
      agentStates: task.agentStates?.map(agent => ({
        ...agent,
        status: agent.status === 'completed' ? agent.status : 'skipped',
      })),
      summary: task.summary ?? 'Workflow stopped',
    }
  })
}

export function skipWorkflowAgent(
  taskId: string,
  agentId: AgentId,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running' && task.status !== 'pending') {
      return task
    }

    const nextControllers = new Map(getAgentControllers(task))
    nextControllers.get(agentId)?.abort()
    nextControllers.delete(agentId)

    return {
      ...task,
      agentControllers: nextControllers,
      agentStates: task.agentStates?.map(agent =>
        agent.agentId === agentId
          ? {
              ...agent,
              status: 'skipped',
              summary: agent.summary ?? 'Skipped in reconstructed snapshot',
            }
          : agent,
      ),
    }
  })
}

export function retryWorkflowAgent(
  taskId: string,
  agentId: AgentId,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running' && task.status !== 'pending') {
      return task
    }

    return {
      ...task,
      agentStates: task.agentStates?.map(agent =>
        agent.agentId === agentId
          ? {
              ...agent,
              status: 'pending',
              error: undefined,
              summary: 'Retry requested in reconstructed snapshot',
            }
          : agent,
      ),
    }
  })
}

export const LocalWorkflowTask: Task = {
  name: 'LocalWorkflowTask',
  type: 'local_workflow',
  async kill(taskId, setAppState) {
    killWorkflowTask(taskId, setAppState)
  },
}
