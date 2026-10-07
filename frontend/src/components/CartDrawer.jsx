import { useState } from "react";
import { money } from "../utils/format.js";

function CartDrawer({
  user,
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

  return (
    <div className="modal-backdrop drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="drawer-heading">
          <div>
            <span className="eyebrow muted-eyebrow">YOUR PICKS</span>
            <h2 id="cart-title">Your bag <span>({cartCount})</span></h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close cart">×</button>
        </div>
        {!user ? (
          <div className="empty-state drawer-empty">
            Sign in to see and save items in your bag.
            <button className="primary-button" onClick={onSignIn}>Sign in</button>
          </div>
        ) : !cart.length ? (
          <div className="empty-state drawer-empty">Your bag is waiting for something good.</div>
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
                    <strong>{item.product?.name || "Unavailable product"}</strong>
                    <span>{money(item.product?.price)}</span>
                    <div className="quantity-control">
                      <button
                        onClick={() => item.quantity > 1
                          ? onUpdateQuantity(item.product._id, item.quantity - 1)
                          : onRemove(item.product._id)}
                        aria-label="Decrease quantity"
                      >−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product._id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >+</button>
                      <button className="remove-button" onClick={() => onRemove(item.product._id)}>Remove</button>
                    </div>
                  </div>
                  <strong className="line-total">{money((item.product?.price || 0) * item.quantity)}</strong>
                </article>
              ))}
            </div>
            <div className="cart-summary">
              <div className="subtotal"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div>
              <p>Delivery details are collected at checkout.</p>
              <form onSubmit={onCheckout} className="form-stack checkout-form">
                <label>
                  Delivery address
                  <textarea name="address" required rows="2" placeholder="Street, city, postal code" />
                </label>
                <fieldset className="payment-options">
                  <legend>Pay with</legend>
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="momo"
                      checked={paymentMethod === "momo"}
                      onChange={() => setPaymentMethod("momo")}
                    />
                    MTN MoMo
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="airtel_money"
                      checked={paymentMethod === "airtel_money"}
                      onChange={() => setPaymentMethod("airtel_money")}
                    />
                    Airtel Money
                  </label>
                  <label className="payment-option-disabled">
                    <input type="radio" name="paymentMethod" value="bank_of_kigali" disabled />
                    Bank of Kigali (USSD details needed)
                  </label>
                  <p>USSD opens on your phone after you place the order. Never enter your PIN on this website.</p>
                </fieldset>
                <button className="primary-button" disabled={busy}>
                  {busy ? "Placing order..." : `Place order · ${money(cartTotal)}`}
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
