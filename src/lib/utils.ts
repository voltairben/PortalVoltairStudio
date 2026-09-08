export type ClassValue = string | number | null | false | undefined;

/** Minimal classnames joiner. Swap for `clsx` + `tailwind-merge` if conflicts appear. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
