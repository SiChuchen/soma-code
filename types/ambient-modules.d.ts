declare module '*.md' {
  const content: string
  export default content
}

declare module '*.txt' {
  const content: string
  export default content
}

declare module '*.node' {
  const nativeModule: any
  export default nativeModule
}

declare module '@anthropic-ai/claude-agent-sdk' {
  export type PermissionMode = string
}
