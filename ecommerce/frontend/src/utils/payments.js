const paymentProviders = {
  momo: {
    label: "MTN MoMo",
    merchantNumber: "0787377750",
    ussdPrefix: "*182*1*1",
  },
  airtel_money: {
    label: "Airtel Money",
    merchantNumber: "0722294954",
    ussdPrefix: "*500*1*1",
  },
};

export function getPaymentInstructions(order) {
  const provider = paymentProviders[order.paymentMethod];
  if (!provider) return null;

  const amount = Math.round(order.total);
  const ussd = `${provider.ussdPrefix}*${provider.merchantNumber}*${amount}#`;
  return {
    label: provider.label,
    amount,
    ussd,
    dialUrl: `tel:${encodeURIComponent(ussd)}`,
  };
}

export function isMobileDevice() {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}
