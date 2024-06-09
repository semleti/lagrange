/**
 * Simple numeric checking function.
 * @param n the object to check
 * @returns `true` if `n` is a number or can be interpreted as a number (excluding empty values), `false` otherwise
 */
export function isNumeric(n: string | number | boolean) {
  if (['number'].includes(typeof(n))) {
    return true
  } else if (!n) {
    return false
  }
  return !isNaN(Number(n))
}

/**
 * Simple clamp function.
 * @param n the number to clamp
 * @param min minimum value
 * @param max maximum value
 * @returns `n`, so that `min <= n <= max`
 */
export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max))
}

/**
 * Simple clamp function, but with `Number.EPSILON` (ε) added to the mix.
 * @param n the number to clamp
 * @param min minimum value
 * @param max maximum value
 * @returns `n`, so that `(min + ε) <= n <= (max - ε)`
 */
export function epsilonClamp(n: number, min: number, max: number) {
  return Math.max(min + Number.EPSILON, Math.min(n, max - Number.EPSILON))
}