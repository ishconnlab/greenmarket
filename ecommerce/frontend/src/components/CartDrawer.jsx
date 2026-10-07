import { useState } from "react";
import { money } from "../utils/format.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function CartDrawer({
  user,
  store,
  cart,
  cartCount,
  cartTotal,
  busy,
  onClose,
  onSignIn,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}) {
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [paymentAccount, setPaymentAccount] = useState("");
  const { t } = useLanguage();

  return (
    <div className="modal-backdrop drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="drawer-heading">
          <div>
            <span className="eyebrow muted-eyebrow">{t("YOUR PICKS")}</span>
            <h2 id="cart-title">{t("Your bag")} <span>({cartCount})</span></h2>
          </div>
          {store && <p className="cart-store-context">{t("Separate checkout for")} <strong>{store.name}</strong></p>}
          <button className="close-button" onClick={onClose} aria-label={t("Close cart")}>×</button>
        </div>
        {!user ? (
          <div className="empty-state drawer-empty">
            {t("Sign in to see and save items in your bag.")}
              <button className="primary-button" onClick={onSignIn}>{t("Sign in")}</button>
          </div>
        ) : !cart.length ? (
          <div className="empty-state drawer-empty">{t("Your bag is waiting for something good.")}</div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <article className="cart-item" key={item.product?._id || item._id}>
                  {item.product?.imageUrl ? (
                    <img
                      className="cart-item-image"
                      src={item.product.imageUrl}
                      alt={item.product.imageAlt || item.product.name}
                    />
                  ) : (
                    <div className="cart-item-mark">{item.product?.name?.charAt(0)?.toUpperCase()}</div>
                  )}
                  <div className="cart-item-details">
                    <strong>{item.product?.name || t("Unavailable product")}</strong>
                    <span>{money(item.product?.price)}</span>
                    <div className="quantity-control">
                      <button
                        onClick={() => item.quantity > 1
                          ? onUpdateQuantity(item.product._id, item.quantity - 1)
                          : onRemove(item.product._id)}
                        aria-label={t("Decrease quantity")}
                      >−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product._id, item.quantity + 1)}
                        aria-label={t("Increase quantity")}
                      >+</button>
                      <button className="remove-button" onClick={() => onRemove(item.product._id)}>{t("Remove")}</button>
                    </div>
                  </div>
                  <strong className="line-total">{money((item.product?.price || 0) * item.quantity)}</strong>
                </article>
              ))}
            </div>
            <div className="cart-summary">
              <div className="subtotal"><span>{t("Subtotal")}</span><strong>{money(cartTotal)}</strong></div>
              <p>{t("Delivery details are collected at checkout.")}</p>
              <form onSubmit={onCheckout} className="form-stack checkout-form">
                <label>
                  {t("Delivery address")}
                  <textarea name="address" required rows="2" placeholder={t("Street, city, postal code")} />
                </label>
                <fieldset className="payment-options">
                  <legend>{t("Pay with")}</legend>
                  <label className={`payment-choice${paymentMethod === "momo" ? " selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="momo"
                      checked={paymentMethod === "momo"}
                      onChange={() => setPaymentMethod("momo")}
                    />
                    <span className="payment-choice-mark momo-mark" aria-hidden="true">M</span>
                    <span className="payment-choice-copy">
                      <strong>MTN MoMo</strong>
                      <small>{t("Fast mobile money payment")}</small>
                    </span>
                    <span className="payment-choice-check" aria-hidden="true">✓</span>
                  </label>
                  <label className={`payment-choice${paymentMethod === "airtel_money" ? " selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="airtel_money"
                      checked={paymentMethod === "airtel_money"}
                      onChange={() => setPaymentMethod("airtel_money")}
                    />
                    <span className="payment-choice-mark airtel-mark" aria-hidden="true">A</span>
                    <span className="payment-choice-copy">
                      <strong>Airtel Money</strong>
                      <small>{t("Pay with your Airtel wallet")}</small>
                    </span>
                    <span className="payment-choice-check" aria-hidden="true">✓</span>
                  </label>
                  <label className={`payment-choice${paymentMethod === "bank_of_kigali" ? " selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_of_kigali"
                      checked={paymentMethod === "bank_of_kigali"}
                      onChange={() => setPaymentMethod("bank_of_kigali")}
                    />
                    <span className="payment-choice-mark bank-mark" aria-hidden="true">BK</span>
                    <span className="payment-choice-copy">
                      <strong>Bank of Kigali</strong>
                      <small>{t("Bank transfer · confirmed by the store")}</small>
                    </span>
                    <span className="payment-choice-check" aria-hidden="true">✓</span>
                  </label>
                  <label className="payment-account-field">
                    {paymentMethod === "bank_of_kigali" ? t("BK account number used to pay") : t("Mobile money number")}
                    <input
                      name="paymentAccount"
                      type="tel"
                      inputMode="numeric"
                      autoComplete={paymentMethod === "bank_of_kigali" ? "off" : "tel"}
                      maxLength={24}
                      value={paymentAccount}
                      onChange={(event) => setPaymentAccount(event.target.value)}
                      placeholder={paymentMethod === "bank_of_kigali" ? t("Enter your BK account number") : "07XX XXX XXX"}
                      pattern={paymentMethod === "bank_of_kigali" ? "[0-9\\s-]{8,24}" : "(?:\\+?250[\\s-]?|0)?7[0-9\\s-]{8,12}"}
                      title={paymentMethod === "bank_of_kigali"
                        ? t("Enter a valid BK account number.")
                        : t("Enter a valid Rwanda mobile number.")}
                      required
                    />
                    <small>{paymentMethod === "bank_of_kigali"
                      ? t("We use this to help the store match your transfer. Transfer instructions will be confirmed with the store.")
                      : t("Enter the number you will use. Never enter your mobile money PIN here.")}</small>
                  </label>
                  <p className="payment-safety-note">
                    <span aria-hidden="true">🔒</span>
                    {t("Payments are confirmed by the store. Never enter your PIN on this website.")}
                  </p>
                </fieldset>
                <button className="primary-button" disabled={busy}>
                  {busy ? t("Placing order...") : t("Place order · {total}", { total: money(cartTotal) })}
                </button>
              </form>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
