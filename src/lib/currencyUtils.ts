/**
 * Currency utilities and freelance currency definitions.
 * Provides supported currency options, symbols, and formatting for client billing.
 */

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  label: string;
}

export const FREELANCE_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound', label: 'GBP (£)' },
];

/**
 * Returns the appropriate single-character currency symbol for a currency code.
 * Defaults to '₹' (INR) for backwards compatibility.
 */
export function getCurrencySymbol(currency?: string | null): string {
  switch (currency?.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
    default:
      return '₹';
  }
}

/**
 * Formats a numeric monetary amount with its respective currency symbol and locale format.
 */
export function formatCurrencyAmount(amount: number, currency?: string | null): string {
  const symbol = getCurrencySymbol(currency);
  const isINR = !currency || currency.toUpperCase() === 'INR';
  const locale = isINR ? 'en-IN' : 'en-US';
  return `${symbol}${amount.toLocaleString(locale)}`;
}

