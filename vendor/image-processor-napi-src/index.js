export function getNativeModule() {
  return null
}

export function sharp(_input) {
  throw new Error('image-processor-napi unavailable in reconstructed snapshot')
}

export default sharp
