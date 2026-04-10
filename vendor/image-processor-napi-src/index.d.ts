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
declare const defaultSharp: typeof sharp
export default defaultSharp
