import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { apiErrorMessage } from "../utils/apiError.js";
import { money } from "../utils/format.js";

function OrdersPage({ user, onSignIn }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    api.get("/orders")
      .then(({ data }) => {
        if (active) setOrders(data.orders);
      })
      .catch((requestError) => {
        if (active) {
          setError(apiErrorMessage(requestError, "Could not load your orders."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <main className="orders-page">
      <Link className="back-link" to="/">← Back to shopping</Link>
      <span className="eyebrow muted-eyebrow">YOUR GREEN MARKET</span>
      <h1>Order history</h1>
      {!user ? (
        <div className="empty-state">
          Sign in to view your orders.
          <button className="primary-button orders-signin" onClick={onSignIn}>Sign in</button>
        </div>
      ) : loading ? (
        <div className="empty-state">Loading your orders...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : !orders.length ? (
        <div className="empty-state">No orders yet. Your next favorite is out there.</div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order._id}>
              <div>
                <strong>Order {order._id.slice(-6).toUpperCase()}</strong>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span>{order.items.map((item) => `${item.product?.name || item.productName || "Removed product"} × ${item.quantity}`).join(", ")}</span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="customer-order-meta">
                <small>{order.status}</small>
                <small>
                  {order.paymentMethod === "momo"
                    ? "MTN MoMo"
                    : order.paymentMethod === "airtel_money"
                      ? "Airtel Money"
                      : "Payment not recorded"}
                  {" · "}
                  {order.paymentStatus === "paid" ? "Paid" : "Awaiting confirmation"}
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default OrdersPage;
