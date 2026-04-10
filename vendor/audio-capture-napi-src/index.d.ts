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
