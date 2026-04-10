declare namespace AntComputerUse {
  type CoordinateMode = 'pixels' | 'normalized'

  interface CuGrantFlags {
    clipboardRead: boolean
    clipboardWrite: boolean
    systemKeyCombos: boolean
  }

  interface AppGrant {
    bundleId: string
    displayName: string
    grantedAt: number
  }

  interface RequestedApp {
    requestedName: string
    resolved?: {
      bundleId: string
      displayName: string
      path?: string
    }
    alreadyGranted?: boolean
  }

  interface CuPermissionRequest {
    apps: RequestedApp[]
    requestedFlags: CuGrantFlags
    reason?: string
    willHide?: Array<{ bundleId: string; displayName: string }>
    tccState?: {
      accessibility: boolean
      screenRecording: boolean
    }
  }

  interface CuPermissionResponse {
    granted: AppGrant[]
    denied: string[]
    flags: CuGrantFlags
  }

  interface ScreenshotDims {
    width: number
    height: number
    displayWidth: number
    displayHeight: number
    displayId?: number
    originX?: number
    originY?: number
  }

  interface ScreenshotResult extends ScreenshotDims {
    base64: string
  }

  interface DisplayGeometry {
    id?: number
    width: number
    height: number
    scaleFactor: number
  }

  interface FrontmostApp {
    bundleId: string
    displayName: string
  }

  interface InstalledApp {
    bundleId: string
    displayName: string
    path: string
    iconDataUrl?: string
  }

  interface RunningApp {
    bundleId: string
    displayName: string
    pid?: number
  }

  interface ResolvePrepareCaptureResult extends ScreenshotResult {
    hidden?: string[]
    activated?: string
    selectedDisplayId?: number
    resolvedDisplayId?: number
  }

  interface ComputerExecutor {
    capabilities: {
      hostBundleId: string
      platform: string
      screenshotFiltering: string
      [key: string]: unknown
    }
    prepareForAction(
      allowlistBundleIds: string[],
      displayId?: number,
    ): Promise<string[]>
    previewHideSet(
      allowlistBundleIds: string[],
      displayId?: number,
    ): Promise<Array<{ bundleId: string; displayName: string }>>
    getDisplaySize(displayId?: number): Promise<DisplayGeometry>
    listDisplays(): Promise<DisplayGeometry[]>
    findWindowDisplays(
      bundleIds: string[],
    ): Promise<Array<{ bundleId: string; displayIds: number[] }>>
    resolvePrepareCapture(opts: {
      allowedBundleIds: string[]
      preferredDisplayId?: number
      autoResolve: boolean
      doHide?: boolean
    }): Promise<ResolvePrepareCaptureResult>
    screenshot(opts: {
      allowedBundleIds: string[]
      displayId?: number
    }): Promise<ScreenshotResult>
    zoom(
      regionLogical: { x: number; y: number; w: number; h: number },
      allowedBundleIds: string[],
      displayId?: number,
    ): Promise<{ base64: string; width: number; height: number }>
    key(keySequence: string, repeat?: number): Promise<void>
    holdKey(keyNames: string[], durationMs: number): Promise<void>
    type(text: string, opts: { viaClipboard: boolean }): Promise<void>
    readClipboard(): Promise<string>
    writeClipboard(text: string): Promise<void>
    moveMouse(x: number, y: number): Promise<void>
    click(
      x: number,
      y: number,
      button: 'left' | 'right' | 'middle',
      count: 1 | 2 | 3,
      modifiers?: string[],
    ): Promise<void>
    mouseDown(): Promise<void>
    mouseUp(): Promise<void>
    getCursorPosition(): Promise<{ x: number; y: number }>
    drag(
      from: { x: number; y: number } | undefined,
      to: { x: number; y: number },
    ): Promise<void>
    scroll(x: number, y: number, dx: number, dy: number): Promise<void>
    getFrontmostApp(): Promise<FrontmostApp | null>
    appUnderPoint(
      x: number,
      y: number,
    ): Promise<{ bundleId: string; displayName: string } | null>
    listInstalledApps(): Promise<InstalledApp[]>
    getAppIcon(path: string): Promise<string | undefined>
    listRunningApps(): Promise<RunningApp[]>
    openApp(bundleId: string): Promise<void>
  }

  interface CuSubGates {
    pixelValidation: boolean
    clipboardPasteMultiline: boolean
    mouseAnimation: boolean
    hideBeforeAction: boolean
    autoTargetDisplay: boolean
    clipboardGuard: boolean
  }

  interface Logger {
    silly(message: string, ...args: unknown[]): void
    debug(message: string, ...args: unknown[]): void
    info(message: string, ...args: unknown[]): void
    warn(message: string, ...args: unknown[]): void
    error(message: string, ...args: unknown[]): void
  }

  interface ComputerUseHostAdapter {
    serverName: string
    logger: Logger
    executor: ComputerExecutor
    ensureOsPermissions(): Promise<
      | { granted: true }
      | {
          granted: false
          accessibility: boolean
          screenRecording: boolean
        }
    >
    isDisabled(): boolean
    getSubGates(): CuSubGates
    getAutoUnhideEnabled(): boolean
    cropRawPatch(...args: unknown[]): Uint8Array | Buffer | null
  }

  interface ToolDefinition {
    name: string
    description?: string
    inputSchema?: Record<string, unknown>
    [key: string]: unknown
  }

  interface CuTextToolContent {
    type: 'text'
    text: string
  }

  interface CuImageToolContent {
    type: 'image'
    data: string
    mimeType?: string
  }

  interface CuUnknownToolContent {
    type: string
    text?: string
    data?: string
    mimeType?: string
    [key: string]: unknown
  }

  type CuToolContent =
    | CuTextToolContent
    | CuImageToolContent
    | CuUnknownToolContent

  interface CuCallToolResult {
    content: CuToolContent[] | Record<string, unknown> | string
    telemetry?: {
      error_kind?: string | null
      [key: string]: unknown
    }
  }

  interface ComputerUseSessionContext {
    getAllowedApps(): readonly AppGrant[]
    getGrantFlags(): CuGrantFlags
    getUserDeniedBundleIds(): readonly string[]
    getSelectedDisplayId(): number | undefined
    getDisplayPinnedByModel(): boolean
    getDisplayResolvedForApps(): string | undefined
    getLastScreenshotDims(): ScreenshotDims | undefined
    onPermissionRequest(
      req: CuPermissionRequest,
      dialogSignal?: AbortSignal,
    ): Promise<CuPermissionResponse>
    onAllowedAppsChanged(
      apps: readonly AppGrant[],
      flags: CuGrantFlags,
    ): void
    onAppsHidden(ids: string[]): void
    onResolvedDisplayUpdated(id: number | undefined): void
    onDisplayPinned(id: number | undefined): void
    onDisplayResolvedForApps(key: string | undefined): void
    onScreenshotCaptured(dims: ScreenshotDims): void
    checkCuLock(): Promise<{ holder?: string; isSelf: boolean }>
    acquireCuLock(): Promise<void>
    formatLockHeldMessage(holder: string): string
  }

  interface ComputerUseToolCapabilities {
    platform: string
    screenshotFiltering: string
    hostBundleId?: string
    [key: string]: unknown
  }

  interface ComputerUseMcpServer {
    setRequestHandler(
      schema: unknown,
      handler: (...args: unknown[]) => unknown,
    ): void
    connect(transport: unknown): Promise<void>
    close(): Promise<void>
  }
}

declare module '@ant/computer-use-mcp/types' {
  export type CoordinateMode = AntComputerUse.CoordinateMode
  export type CuGrantFlags = AntComputerUse.CuGrantFlags
  export type AppGrant = AntComputerUse.AppGrant
  export type CuPermissionRequest = AntComputerUse.CuPermissionRequest
  export type CuPermissionResponse = AntComputerUse.CuPermissionResponse
  export type ScreenshotDims = AntComputerUse.ScreenshotDims
  export type CuSubGates = AntComputerUse.CuSubGates
  export type Logger = AntComputerUse.Logger
  export type ComputerUseHostAdapter = AntComputerUse.ComputerUseHostAdapter

  export const DEFAULT_GRANT_FLAGS: CuGrantFlags
}

declare module '@ant/computer-use-mcp' {
  export type CoordinateMode = AntComputerUse.CoordinateMode
  export type CuGrantFlags = AntComputerUse.CuGrantFlags
  export type AppGrant = AntComputerUse.AppGrant
  export type CuPermissionRequest = AntComputerUse.CuPermissionRequest
  export type CuPermissionResponse = AntComputerUse.CuPermissionResponse
  export type ScreenshotDims = AntComputerUse.ScreenshotDims
  export type ScreenshotResult = AntComputerUse.ScreenshotResult
  export type DisplayGeometry = AntComputerUse.DisplayGeometry
  export type FrontmostApp = AntComputerUse.FrontmostApp
  export type InstalledApp = AntComputerUse.InstalledApp
  export type RunningApp = AntComputerUse.RunningApp
  export type ResolvePrepareCaptureResult =
    AntComputerUse.ResolvePrepareCaptureResult
  export type ComputerExecutor = AntComputerUse.ComputerExecutor
  export type CuSubGates = AntComputerUse.CuSubGates
  export type Logger = AntComputerUse.Logger
  export type ComputerUseHostAdapter = AntComputerUse.ComputerUseHostAdapter
  export type CuCallToolResult = AntComputerUse.CuCallToolResult
  export type ComputerUseSessionContext =
    AntComputerUse.ComputerUseSessionContext
  export type ToolDefinition = AntComputerUse.ToolDefinition

  export const DEFAULT_GRANT_FLAGS: CuGrantFlags
  export const API_RESIZE_PARAMS: Readonly<Record<string, unknown>>

  export function targetImageSize(
    width: number,
    height: number,
    params: Readonly<Record<string, unknown>>,
  ): [number, number]

  export function buildComputerUseTools(
    capabilities: AntComputerUse.ComputerUseToolCapabilities,
    coordinateMode: CoordinateMode,
    installedAppNames?: string[],
  ): ToolDefinition[]

  export function createComputerUseMcpServer(
    adapter: ComputerUseHostAdapter,
    coordinateMode: CoordinateMode,
  ): AntComputerUse.ComputerUseMcpServer

  export function bindSessionContext(
    adapter: ComputerUseHostAdapter,
    coordinateMode: CoordinateMode,
    ctx: ComputerUseSessionContext,
  ): (name: string, args: unknown) => Promise<CuCallToolResult>
}

declare module '@ant/computer-use-mcp/sentinelApps' {
  export function getSentinelCategory(
    bundleId: string,
  ): 'shell' | 'filesystem' | 'system_settings' | null
}

declare module '@ant/computer-use-input' {
  export interface ComputerUseInputAPI {
    isSupported: true
    moveMouse(x: number, y: number, animate?: boolean): Promise<void>
    mouseLocation(): Promise<{ x: number; y: number }>
    key(keyName: string, action: 'press' | 'release'): Promise<void>
    keys(parts: readonly string[]): Promise<void>
    typeText(text: string): Promise<void>
    mouseButton(
      button: 'left' | 'right' | 'middle',
      action: 'click' | 'press' | 'release',
      count?: 1 | 2 | 3,
    ): Promise<void>
    mouseScroll(delta: number, axis: 'vertical' | 'horizontal'): Promise<void>
    getFrontmostAppInfo():
      | { bundleId?: string; appName: string }
      | null
      | undefined
  }

  export type ComputerUseInput =
    | { isSupported: false }
    | ComputerUseInputAPI
}

declare module '@ant/computer-use-swift' {
  export interface ComputerUseAPI {
    _drainMainRunLoop(): void
    hotkey: {
      registerEscape(onEscape: () => void): boolean
      unregister(): void
      notifyExpectedEscape(): void
    }
    tcc: {
      checkAccessibility(): boolean
      checkScreenRecording(): boolean
    }
    apps: {
      prepareDisplay(
        allowlistBundleIds: string[],
        hostBundleId: string,
        displayId?: number,
      ): Promise<{ hidden: string[]; activated?: string }>
      previewHideSet(
        allowlistBundleIds: string[],
        displayId?: number,
      ): Promise<Array<{ bundleId: string; displayName: string }>>
      findWindowDisplays(
        bundleIds: string[],
      ): Promise<Array<{ bundleId: string; displayIds: number[] }>>
      appUnderPoint(
        x: number,
        y: number,
      ): Promise<{ bundleId: string; displayName: string } | null>
      listInstalled(): Promise<AntComputerUse.InstalledApp[]>
      iconDataUrl(path: string): string | null
      listRunning(): Promise<AntComputerUse.RunningApp[]>
      open(bundleId: string): Promise<void>
      unhide(bundleIds: string[]): Promise<void>
    }
    display: {
      getSize(displayId?: number): AntComputerUse.DisplayGeometry
      listAll(): Promise<AntComputerUse.DisplayGeometry[]>
    }
    screenshot: {
      captureExcluding(
        allowlistBundleIds: string[],
        jpegQuality: number,
        width: number,
        height: number,
        displayId?: number,
      ): Promise<AntComputerUse.ScreenshotResult>
      captureRegion(
        allowlistBundleIds: string[],
        x: number,
        y: number,
        width: number,
        height: number,
        outWidth: number,
        outHeight: number,
        jpegQuality: number,
        displayId?: number,
      ): Promise<{ base64: string; width: number; height: number }>
    }
    resolvePrepareCapture(
      allowlistBundleIds: string[],
      hostBundleId: string,
      jpegQuality: number,
      width: number,
      height: number,
      preferredDisplayId?: number,
      autoResolve?: boolean,
      doHide?: boolean,
    ): Promise<AntComputerUse.ResolvePrepareCaptureResult>
  }
}
