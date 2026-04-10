import type { Command as CommanderCommand } from '@commander-js/extra-typings'
import { writeFile } from 'fs/promises'
import { cliError } from '../exit.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import {
  createTask,
  DEFAULT_TASKS_MODE_TASK_LIST_ID,
  getTask,
  getTasksDir,
  listTasks,
  TASK_STATUSES,
  updateTask,
  type Task,
  type TaskStatus,
} from '../../utils/tasks.js'
import { CLI_COMMAND_NAME } from '../../constants/cliName.js'

type TaskCreateOptions = {
  description?: string
  list?: string
}

type TaskListOptions = {
  list?: string
  pending?: boolean
  json?: boolean
}

type TaskGetOptions = {
  list?: string
}

type TaskUpdateOptions = {
  list?: string
  status?: string
  subject?: string
  description?: string
  owner?: string
  clearOwner?: boolean
}

type TaskDirOptions = {
  list?: string
}

type CompletionOptions = {
  output?: string
}

function getTaskListId(listId?: string): string {
  return listId || DEFAULT_TASKS_MODE_TASK_LIST_ID
}

function stringify(value: unknown): string {
  return jsonStringify(value, null, 2)
}

function sortTasksById(a: Task, b: Task): number {
  const aId = Number(a.id)
  const bId = Number(b.id)
  if (!Number.isNaN(aId) && !Number.isNaN(bId)) {
    return aId - bId
  }
  return a.id.localeCompare(b.id)
}

function formatTask(task: Task): string {
  const lines = [`#${task.id} [${task.status}] ${task.subject}`]

  if (task.description) {
    lines.push(`  description: ${task.description}`)
  }
  if (task.owner) {
    lines.push(`  owner: ${task.owner}`)
  }
  if (task.blocks.length > 0) {
    lines.push(`  blocks: ${task.blocks.join(', ')}`)
  }
  if (task.blockedBy.length > 0) {
    lines.push(`  blockedBy: ${task.blockedBy.join(', ')}`)
  }

  return lines.join('\n')
}

function getTopLevelCommands(program: CommanderCommand): string[] {
  return program.commands
    .map(command => command.name())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

function buildBashCompletion(program: CommanderCommand): string {
  const commands = getTopLevelCommands(program).join(' ')
  return `# somacode completion (reconstructed snapshot)
_soma_recovery_complete() {
  local cur
  cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "${commands}" -- "$cur") )
}
complete -F _soma_recovery_complete ${CLI_COMMAND_NAME}
`
}

function buildZshCompletion(program: CommanderCommand): string {
  const commands = getTopLevelCommands(program)
    .map(command => `'${command}:${command}'`)
    .join(' ')
  return `#compdef ${CLI_COMMAND_NAME}

_soma_recovery_complete() {
  local -a commands
  commands=(${commands})
  _describe 'command' commands
}

compdef _soma_recovery_complete ${CLI_COMMAND_NAME}
`
}

function buildFishCompletion(program: CommanderCommand): string {
  return getTopLevelCommands(program)
    .map(command => `complete -c ${CLI_COMMAND_NAME} -f -a '${command}'`)
    .join('\n')
    .concat('\n')
}

function buildCompletionScript(
  shell: string,
  program: CommanderCommand,
): string | null {
  switch (shell) {
    case 'bash':
      return buildBashCompletion(program)
    case 'zsh':
      return buildZshCompletion(program)
    case 'fish':
      return buildFishCompletion(program)
    default:
      return null
  }
}

function unavailable(command: string, details?: string): never {
  const suffix = details ? ` ${details}` : ''
  return cliError(
    `[ANT-ONLY] ${command} is unavailable in this reconstructed snapshot.${suffix}`,
  )
}

export async function logHandler(logId: string | number | undefined): Promise<void> {
  void logId
  unavailable('log handler')
}

export async function errorHandler(number: number | undefined): Promise<void> {
  void number
  unavailable('error handler')
}

export async function exportHandler(
  source: string,
  outputFile: string,
): Promise<void> {
  void source
  void outputFile
  unavailable('export handler')
}

export async function taskCreateHandler(
  subject: string,
  opts: TaskCreateOptions,
): Promise<void> {
  const taskListId = getTaskListId(opts.list)
  const taskId = await createTask(taskListId, {
    subject,
    description: opts.description ?? '',
    activeForm: undefined,
    owner: undefined,
    status: 'pending',
    blocks: [],
    blockedBy: [],
    metadata: undefined,
  })

  process.stdout.write(
    `Created task #${taskId} in ${taskListId}: ${subject}\n`,
  )
}

export async function taskListHandler(opts: TaskListOptions): Promise<void> {
  const taskListId = getTaskListId(opts.list)
  const tasks = (await listTasks(taskListId))
    .filter(task => !opts.pending || task.status === 'pending')
    .sort(sortTasksById)

  if (opts.json) {
    process.stdout.write(stringify(tasks) + '\n')
    return
  }

  if (tasks.length === 0) {
    process.stdout.write(`No tasks found in ${taskListId}.\n`)
    return
  }

  process.stdout.write(tasks.map(formatTask).join('\n\n') + '\n')
}

export async function taskGetHandler(
  id: string,
  opts: TaskGetOptions,
): Promise<void> {
  const taskListId = getTaskListId(opts.list)
  const task = await getTask(taskListId, id)

  if (!task) {
    cliError(`Task #${id} not found in ${taskListId}`)
  }

  process.stdout.write(formatTask(task) + '\n')
}

export async function taskUpdateHandler(
  id: string,
  opts: TaskUpdateOptions,
): Promise<void> {
  const taskListId = getTaskListId(opts.list)
  const task = await getTask(taskListId, id)

  if (!task) {
    cliError(`Task #${id} not found in ${taskListId}`)
  }

  if (opts.owner && opts.clearOwner) {
    cliError('Cannot use --owner with --clear-owner')
  }

  let status: TaskStatus | undefined
  if (opts.status !== undefined) {
    if (!TASK_STATUSES.includes(opts.status as TaskStatus)) {
      cliError(
        `Invalid task status "${opts.status}". Expected one of: ${TASK_STATUSES.join(', ')}`,
      )
    }
    status = opts.status as TaskStatus
  }

  const updates: Partial<Omit<Task, 'id'>> = {}
  if (status !== undefined) {
    updates.status = status
  }
  if (opts.subject !== undefined) {
    updates.subject = opts.subject
  }
  if (opts.description !== undefined) {
    updates.description = opts.description
  }
  if (opts.owner !== undefined) {
    updates.owner = opts.owner
  }
  if (opts.clearOwner) {
    updates.owner = undefined
  }

  if (Object.keys(updates).length === 0) {
    cliError('No task updates specified')
  }

  const updated = await updateTask(taskListId, id, updates)
  if (!updated) {
    cliError(`Task #${id} not found in ${taskListId}`)
  }

  process.stdout.write(formatTask(updated) + '\n')
}

export async function taskDirHandler(opts: TaskDirOptions): Promise<void> {
  process.stdout.write(getTasksDir(getTaskListId(opts.list)) + '\n')
}

export async function completionHandler(
  shell: string,
  opts: CompletionOptions,
  program: CommanderCommand,
): Promise<void> {
  const script = buildCompletionScript(shell, program)
  if (!script) {
    cliError(`Unsupported shell for completion: ${shell}`)
  }

  if (opts.output) {
    await writeFile(opts.output, script, 'utf8')
    return
  }

  process.stdout.write(script)
}
