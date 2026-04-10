declare const MACRO: any

declare module 'react/compiler-runtime' {
  export const c: any
}

interface PromiseWithResolvers<T> {
  promise: Promise<T>
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: unknown): void
}
