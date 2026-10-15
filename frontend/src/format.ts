export const number = (value: number) => new Intl.NumberFormat('en-US').format(value);
export function money(value: string | number, currency?: string | null): string {
  const suffix = currency ? ` ${currency}` : '';
  if (typeof value === 'string') {
    const [whole, fraction = '00'] = value.split('.');
    return `${new Intl.NumberFormat('en-US').format(BigInt(whole))}.${fraction.padEnd(2, '0')}${suffix}`;
  }
  return (
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + suffix
  );
}
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
export const fileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
