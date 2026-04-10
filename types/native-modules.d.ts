declare module 'audio-capture-napi' {
  export function isNativeAudioAvailable(): boolean
  export function startNativeRecording(
    onData: (data: Uint8Array) => void,
    onEnd: () => void,
  ): boolean
  export function stopNativeRecording(): void
  export function isNativeRecordingActive(): boolean
  export function startNativePlayback(
    sampleRate: number,
    channels: number,
  ): boolean
  export function writeNativePlaybackData(data: Uint8Array): void
  export function stopNativePlayback(): void
  export function isNativePlaying(): boolean
  export function microphoneAuthorizationStatus(): number
}

declare module 'color-diff-napi' {
  export type SyntaxTheme = unknown
  export const ColorDiff: new (...args: any[]) => any
  export const ColorFile: new (...args: any[]) => any
  export function getSyntaxTheme(themeName: string): SyntaxTheme
}

declare module 'image-processor-napi' {
  export type ClipboardImageResult = {
    png: Uint8Array
    originalWidth: number
    originalHeight: number
    width: number
    height: number
  }

  export type NativeModule = {
    processImage?: (...args: any[]) => Promise<any>
    readClipboardImage?: (
      maxWidth: number,
      maxHeight: number,
    ) => ClipboardImageResult | null
    hasClipboardImage?: () => boolean
  }

  export function getNativeModule(): NativeModule | null
  export function sharp(input: Uint8Array): any
  const defaultSharp: typeof sharp
  export default defaultSharp
}

declare module 'modifiers-napi' {
  export function getModifiers(): string[]
  export function isModifierPressed(modifier: string): boolean
  export function prewarm(): void
}

declare module 'url-handler-napi' {
  export function waitForUrlEvent(timeoutMs: number): string | null
}
