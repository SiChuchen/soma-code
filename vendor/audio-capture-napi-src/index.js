export function isNativeAudioAvailable() {
  return false
}

export function startNativeRecording(_onData, _onEnd) {
  return false
}

export function stopNativeRecording() {}

export function isNativeRecordingActive() {
  return false
}

export function startNativePlayback(_sampleRate, _channels) {
  return false
}

export function writeNativePlaybackData(_data) {}

export function stopNativePlayback() {}

export function isNativePlaying() {
  return false
}

export function microphoneAuthorizationStatus() {
  return 0
}
