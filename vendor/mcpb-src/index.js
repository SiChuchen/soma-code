import { z } from 'zod/v4'

const McpbUserConfigurationOptionSchemaInternal = z
  .object({
    type: z.enum(['string', 'number', 'boolean', 'directory', 'file']),
    title: z.string().optional().default(''),
    description: z.string().optional().default(''),
    required: z.boolean().optional(),
    default: z
      .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
      .optional(),
    multiple: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .passthrough()

const McpbManifestSchemaInternal = z
  .object({
    name: z.string().min(1),
    version: z.string().default('0.0.0'),
    author: z
      .object({
        name: z.string().default('unknown'),
      })
      .passthrough(),
    server: z.record(z.string(), z.any()).optional(),
    user_config: z
      .record(z.string(), McpbUserConfigurationOptionSchemaInternal)
      .optional(),
  })
  .passthrough()

export const McpbManifestSchema = {
  parse(value) {
    return McpbManifestSchemaInternal.parse(value)
  },
  safeParse(value) {
    return McpbManifestSchemaInternal.safeParse(value)
  },
}

function substituteString(value, context) {
  return value.replace(/\$\{user_config\.([A-Za-z_]\w*)\}/g, (_match, key) => {
    const replacement = context.userConfig[key]
    return replacement === undefined ? '' : String(replacement)
  }).replace(/\$\{extension_path\}/g, context.extensionPath)
}

function substituteValue(value, context) {
  if (typeof value === 'string') {
    return substituteString(value, context)
  }
  if (Array.isArray(value)) {
    return value.map(item => substituteValue(item, context))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        substituteValue(item, context),
      ]),
    )
  }
  return value
}

function normalizeServerConfig(server, context, fallbackName) {
  const substituted = substituteValue(server, context)
  const type = substituted.type ?? substituted.transport

  if ((type === 'stdio' || (!type && substituted.command)) &&
      typeof substituted.command === 'string') {
    return {
      type: 'stdio',
      command: substituted.command,
      args: Array.isArray(substituted.args)
        ? substituted.args.map(value => String(value))
        : [],
      ...(substituted.env && typeof substituted.env === 'object'
        ? { env: Object.fromEntries(
            Object.entries(substituted.env).map(([key, value]) => [
              key,
              String(value),
            ]),
          ) }
        : {}),
    }
  }

  if ((type === 'http' || type === 'sse' || type === 'ws') &&
      typeof substituted.url === 'string') {
    return {
      type,
      url: substituted.url,
      ...(substituted.headers && typeof substituted.headers === 'object'
        ? { headers: Object.fromEntries(
            Object.entries(substituted.headers).map(([key, value]) => [
              key,
              String(value),
            ]),
          ) }
        : {}),
    }
  }

  if (type === 'sdk' || substituted.name) {
    return {
      type: 'sdk',
      name: typeof substituted.name === 'string' ? substituted.name : fallbackName,
    }
  }

  return null
}

export async function getMcpConfigForManifest({
  manifest,
  extensionPath,
  userConfig = {},
}) {
  const context = {
    extensionPath,
    userConfig,
  }

  if (!manifest?.server || typeof manifest.server !== 'object') {
    return null
  }

  return normalizeServerConfig(manifest.server, context, manifest.name)
}
