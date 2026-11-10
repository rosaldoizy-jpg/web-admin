/**
 * Centralized Philippine Peso Currency Formatter
 * Formats numeric values to Philippine Peso (PHP / ₱) with comma thousand-separators and two decimal places.
 * Example: formatCurrency(1180) => "₱1,180.00"
 */
export const formatCurrency = (amount) => {
  const num = Number(amount || 0);
  return '₱' + num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default formatCurrency;
