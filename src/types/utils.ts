type Primitive = string | number | boolean | bigint | symbol | null | undefined

export type DeepImmutable<T> = T extends Primitive | Function | Date | RegExp
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
    : T extends Set<infer U>
      ? ReadonlySet<DeepImmutable<U>>
      : T extends readonly (infer U)[]
        ? readonly DeepImmutable<U>[]
        : T extends object
          ? { readonly [K in keyof T]: DeepImmutable<T[K]> }
          : T

/**
 * Tuple permutations used by `satisfies` checks to ensure a list contains
 * every member of a union exactly once.
 */
export type Permutations<T, U = T> = [T] extends [never]
  ? readonly []
  : U extends U
    ? readonly [U, ...Permutations<Exclude<T, U>>]
    : never
