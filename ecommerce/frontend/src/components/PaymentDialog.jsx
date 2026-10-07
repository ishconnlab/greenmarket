import { getPaymentInstructions, isMobileDevice } from "../utils/payments.js";
import { money } from "../utils/format.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function PaymentDialog({ order, onClose }) {
  const payment = getPaymentInstructions(order);
  const { t } = useLanguage();

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <button className="close-button" onClick={onClose} aria-label={t("Close payment instructions")}>×</button>
        <span className="eyebrow muted-eyebrow">{t("ORDER {code}", { code: order._id.slice(-6).toUpperCase() })}</span>
        <h2 id="payment-title">{t("Complete your payment")}</h2>
        <p className="payment-intro">
          {payment ? t("Pay {total} with {provider}.", { total: money(order.total), provider: payment.label }) : t("Your order was placed.")}
          {" "}{t("Payment is not confirmed automatically; the store will verify it.")}
        </p>
        {payment && (payment.bankTransfer ? (
          <div className="payment-instructions">
            <span>{t("Your BK account")}</span>
            <strong>{payment.account}</strong>
            <span>{t("Amount to transfer")}</span>
            <strong>{money(payment.amount)}</strong>
            <p className="payment-mobile-note">{t("Contact the store for its Bank of Kigali transfer details. Your order remains awaiting confirmation until the store verifies payment.")}</p>
          </div>
        ) : (
          <div className="payment-instructions">
            <span>{t("Merchant number")}</span>
            <strong>{order.paymentMethod === "momo" ? "0787377750" : "0722294954"}</strong>
            <span>{t("Paying from")}</span>
            <strong>{order.paymentAccount}</strong>
            <span>{t("Amount")}</span>
            <strong>{money(payment.amount)}</strong>
            {isMobileDevice() ? (
              <a className="primary-button payment-dial-button" href={payment.dialUrl}>
                {t("Open {provider} USSD on this phone", { provider: payment.label })}
              </a>
            ) : (
              <p className="payment-mobile-note">
                {t("Open this order on your mobile phone to launch USSD. Code:")} <strong>{payment.ussd}</strong>
              </p>
            )}
          </div>
        ))}
        <p className="payment-safety">
          {t(order.paymentMethod === "bank_of_kigali"
            ? "Your payer account number is shared only with the store handling your order. Never share your banking PIN."
            : "Enter your payment PIN only in the phone’s secure USSD prompt. Never share it with the store or enter it on this website.")}
        </p>
        <button className="retry-button payment-done-button" onClick={onClose}>{t("Done")}</button>
      </section>
    </div>
  );
}

export default PaymentDialog;
