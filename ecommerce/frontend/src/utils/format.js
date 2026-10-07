export function money(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "FRW",
  }).format(amount || 0);
}
