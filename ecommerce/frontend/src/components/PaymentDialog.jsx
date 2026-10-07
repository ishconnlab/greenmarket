import { getPaymentInstructions, isMobileDevice } from "../utils/payments.js";
import { money } from "../utils/format.js";

function PaymentDialog({ order, onClose }) {
  const payment = getPaymentInstructions(order);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title">
        <button className="close-button" onClick={onClose} aria-label="Close payment instructions">×</button>
        <span className="eyebrow muted-eyebrow">ORDER {order._id.slice(-6).toUpperCase()}</span>
        <h2 id="payment-title">Complete your payment</h2>
        <p className="payment-intro">
          {payment ? `Pay ${money(order.total)} with ${payment.label}.` : "Your order was placed."}
          {" "}Payment is not confirmed automatically; the store will verify it.
        </p>
        {payment && (
          <div className="payment-instructions">
            <span>Merchant number</span>
            <strong>{order.paymentMethod === "momo" ? "0787377750" : "0722294954"}</strong>
            <span>Amount</span>
            <strong>{money(payment.amount)}</strong>
            {isMobileDevice() ? (
              <a className="primary-button payment-dial-button" href={payment.dialUrl}>
                Open {payment.label} USSD on this phone
              </a>
            ) : (
              <p className="payment-mobile-note">
                Open this order on your mobile phone to launch USSD. Code: <strong>{payment.ussd}</strong>
              </p>
            )}
          </div>
        )}
        <p className="payment-safety">
          Enter your payment PIN only in the phone’s secure USSD prompt. Never share it with the store or enter it on this website.
        </p>
        <button className="retry-button payment-done-button" onClick={onClose}>Done</button>
      </section>
    </div>
  );
}

export default PaymentDialog;
