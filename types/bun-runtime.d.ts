declare const Bun: any

declare const require: (id: string) => any

declare module 'bun:bundle' {
  export function feature(name: string): boolean
}

declare module 'bun:ffi' {
  const ffi: any
  export = ffi
}
