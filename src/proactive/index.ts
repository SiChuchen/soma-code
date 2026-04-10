type Listener = () => void

type ProactiveState = {
  active: boolean
  paused: boolean
  contextBlocked: boolean
  nextTickAt: number | null
  source: string | null
}

const PROACTIVE_RUNTIME_SUPPORTED = false

const listeners = new Set<Listener>()

let state: ProactiveState = {
  active: false,
  paused: true,
  contextBlocked: false,
  nextTickAt: null,
  source: null,
}

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

function updateState(nextState: ProactiveState): void {
  if (
    state.active === nextState.active &&
    state.paused === nextState.paused &&
    state.contextBlocked === nextState.contextBlocked &&
    state.nextTickAt === nextState.nextTickAt &&
    state.source === nextState.source
  ) {
    return
  }

  state = nextState
  emit()
}

export function subscribeToProactiveChanges(listener: Listener): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function isProactiveActive(): boolean {
  return state.active
}

export function isProactivePaused(): boolean {
  return !PROACTIVE_RUNTIME_SUPPORTED || state.paused || state.contextBlocked
}

export function getNextTickAt(): number | null {
  return isProactiveActive() && !isProactivePaused() ? state.nextTickAt : null
}

export function activateProactive(source = 'command'): void {
  updateState({
    active: true,
    paused: true,
    contextBlocked: false,
    nextTickAt: null,
    source,
  })
}

export function deactivateProactive(): void {
  updateState({
    active: false,
    paused: true,
    contextBlocked: false,
    nextTickAt: null,
    source: null,
  })
}

export function pauseProactive(): void {
  if (!state.active) {
    return
  }

  updateState({
    ...state,
    paused: true,
    nextTickAt: null,
  })
}

export function resumeProactive(): void {
  if (!state.active) {
    return
  }

  updateState({
    ...state,
    paused: true,
    nextTickAt: null,
  })
}

export function setContextBlocked(contextBlocked: boolean): void {
  updateState({
    ...state,
    contextBlocked,
    nextTickAt: null,
  })
}
