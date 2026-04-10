export type McpbUserConfigurationOption = {
  type: 'string' | 'number' | 'boolean' | 'directory' | 'file'
  title: string
  description: string
  required?: boolean
  default?: string | number | boolean | string[]
  multiple?: boolean
  sensitive?: boolean
  min?: number
  max?: number
}

export type McpbManifest = {
  name: string
  version: string
  author: {
    name: string
  }
  server?: Record<string, unknown>
  user_config?: Record<string, McpbUserConfigurationOption>
  [key: string]: unknown
}

export const McpbManifestSchema: {
  parse(value: unknown): McpbManifest
  safeParse(value: unknown):
    | { success: true; data: McpbManifest }
    | { success: false; error: { flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] } } }
}

export function getMcpConfigForManifest(input: {
  manifest: McpbManifest
  extensionPath: string
  systemDirs?: unknown
  userConfig?: Record<string, string | number | boolean | string[]>
  pathSeparator?: string
}): Promise<Record<string, unknown> | null>
