import { en } from "@/i18n/en";
import { es } from "@/i18n/es";

export function getDictionary(locale: "en" | "es") {
  return locale === "es" ? es : en;
}

/**
 * Widen literal types (e.g. `"KlipCode"` → `string`) recursively while keeping
 * the shape. The English dictionary is the canonical structure; `Dictionary` is
 * derived from it so every consumer sees plain `string`s, and `es` is checked
 * against it (`satisfies Dictionary`) so a missing or mistyped key fails the
 * build instead of silently diverging.
 */
type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => Widen<R>
  : T extends readonly (infer E)[]
    ? readonly Widen<E>[]
    : T extends object
      ? { -readonly [K in keyof T]: Widen<T[K]> }
      : T extends string
        ? string
        : T extends number
          ? number
          : T extends boolean
            ? boolean
            : T;

export type Dictionary = Widen<typeof en>;
