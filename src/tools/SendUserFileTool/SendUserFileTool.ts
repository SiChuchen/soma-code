import { z } from 'zod/v4'
import { getKairosActive } from '../../bootstrap/state.js'
import { type ValidationResult } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getDisplayPath } from '../../utils/file.js'
import { formatFileSize } from '../../utils/format.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { plural } from '../../utils/stringUtils.js'
import {
  resolveAttachments,
  type ResolvedAttachment,
  validateAttachmentPaths,
} from '../BriefTool/attachments.js'
import { DESCRIPTION, PROMPT, SEND_USER_FILE_TOOL_NAME } from './prompt.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    files: z
      .array(z.string())
      .min(1)
      .describe(
        'File paths (absolute or cwd-relative) to deliver to the user as attachments.',
      ),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    message: z.string().describe('Summary of the delivered files'),
    files: z
      .array(
        z.object({
          path: z.string(),
          size: z.number(),
          isImage: z.boolean(),
          file_uuid: z.string().optional(),
        }),
      )
      .describe('Resolved file metadata'),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

function buildSummary(files: readonly ResolvedAttachment[]): string {
  const count = files.length
  return `Sent ${count} ${plural(count, 'file')} to the user.`
}

function renderFileList(files: readonly ResolvedAttachment[]): string {
  return files
    .map(file => {
      const kind = file.isImage ? '[image]' : '[file]'
      return `${kind} ${getDisplayPath(file.path)} (${formatFileSize(file.size)})`
    })
    .join('\n')
}

export const SendUserFileTool = buildTool({
  name: SEND_USER_FILE_TOOL_NAME,
  searchHint: 'deliver files as user attachments',
  maxResultSizeChars: 100_000,
  shouldDefer: true,
  userFacingName() {
    return ''
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return getKairosActive()
  },
  isConcurrencySafe() {
    return true
  },
  toAutoClassifierInput(input) {
    return input.files.join('\n')
  },
  async validateInput({ files }): Promise<ValidationResult> {
    return validateAttachmentPaths(files)
  },
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: output.message,
    }
  },
  renderToolUseMessage() {
    return null
  },
  renderToolResultMessage(output) {
    const fileList = renderFileList(output.files)
    return fileList ? `${output.message}\n${fileList}` : output.message
  },
  async call({ files }, context) {
    const appState = context.getAppState()
    const resolved = await resolveAttachments(files, {
      replBridgeEnabled: appState.replBridgeEnabled,
      signal: context.abortController.signal,
    })

    return {
      data: {
        message: buildSummary(resolved),
        files: resolved,
      },
    }
  },
} satisfies ToolDef<InputSchema, Output>)
