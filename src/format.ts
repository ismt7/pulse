export const format = (value: number): string =>
  new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(value);
