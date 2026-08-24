export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
export function fmt(n: number): string { return Math.round(n).toString(); }
