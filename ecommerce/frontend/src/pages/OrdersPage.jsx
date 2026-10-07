import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { apiErrorMessage } from "../utils/apiError.js";
import { money } from "../utils/format.js";
import { downloadOrderReceipt } from "../utils/orderPdf.js";
import {
  disableOrderNotifications,
  enableOrderNotifications,
  getSavedPushSubscription,
  supportsOrderNotifications,
} from "../utils/pushNotifications.js";

const paymentLabels = {
  momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  not_recorded: "Payment not recorded",
};

function OrdersPage({ user, onSignIn }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");
  const [notificationState, setNotificationState] = useState("checking");
  const [notificationError, setNotificationError] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [busyPdf, setBusyPdf] = useState("");
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setOrders([]);
      setNotificationState("checking");
      return undefined;
    }

    let active = true;
    async function loadOrders(initial = false) {
      if (initial) setLoading(true);
      try {
        const { data } = await api.get("/orders");
        if (active) {
          setOrders(data.orders);
          setError("");
        }
      } catch (requestError) {
        if (active && (initial || !document.hidden)) {
          setError(apiErrorMessage(requestError, "Could not load your orders."));
        }
      } finally {
        if (active && initial) setLoading(false);
      }
    }

    void loadOrders(true);
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadOrders();
    }, 20000);
    const onFocus = () => void loadOrders();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    if (!supportsOrderNotifications()) {
      setNotificationState("unsupported");
      return undefined;
    }

    getSavedPushSubscription()
      .then(async (savedSubscription) => {
        if (!active) return;
        if (savedSubscription) await api.get("/notifications/public-key");
        setSubscription(savedSubscription);
        setNotificationState(savedSubscription ? "enabled" : "disabled");
      })
      .catch((requestError) => {
        if (active) {
          setNotificationState("disabled");
          setNotificationError(requestError.message || "Could not check notification settings.");
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function toggleNotifications() {
    setNotificationError("");
    setNotificationState("working");
    try {
      if (subscription) {
        await disableOrderNotifications(subscription);
        setSubscription(null);
        setNotificationState("disabled");
      } else {
        const savedSubscription = await enableOrderNotifications();
        setSubscription(savedSubscription);
        setNotificationState("enabled");
      }
    } catch (requestError) {
      setNotificationState(subscription ? "enabled" : "disabled");
      setNotificationError(apiErrorMessage(requestError, "Could not update notification settings."));
    }
  }

  async function exportReceipt(order) {
    setBusyPdf(order._id);
    setPdfError("");
    try {
      await downloadOrderReceipt(order);
    } catch (requestError) {
      console.error("Could not export order receipt:", requestError);
      setPdfError("Could not create the PDF receipt. Please try again.");
    } finally {
      setBusyPdf("");
    }
  }

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
      ) : (
        <>
          <section className="order-notification-panel" aria-labelledby="order-notification-heading">
            <div>
              <span className="eyebrow muted-eyebrow">STAY IN THE LOOP</span>
              <h2 id="order-notification-heading">Order notifications</h2>
              <p>Get a device notification when your order is received, its status changes, or payment is confirmed—even when this site is closed.</p>
            </div>
            {notificationState === "unsupported" ? (
              <span className="notification-status">Notifications aren’t supported in this browser.</span>
            ) : (
              <button
                className={notificationState === "enabled" ? "retry-button" : "primary-button"}
                disabled={notificationState === "checking" || notificationState === "working"}
                onClick={toggleNotifications}
              >
                {notificationState === "checking"
                  ? "Checking..."
                  : notificationState === "working"
                    ? "Saving..."
                    : notificationState === "enabled"
                      ? "Turn off notifications"
                      : "Enable order notifications"}
              </button>
            )}
            {notificationError && <p className="notification-error" role="alert">{notificationError}</p>}
            {notificationState === "enabled" && (
              <p className="notification-status" role="status">Enabled for this browser and account.</p>
            )}
          </section>

          {loading ? (
            <div className="empty-state">Loading your orders...</div>
          ) : error ? (
            <div className="empty-state" role="alert">{error}</div>
          ) : !orders.length ? (
            <div className="empty-state">No orders yet. Your next favorite is out there.</div>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <article className="order-card" key={order._id}>
                  <div className="order-card-heading">
                    <div>
                      <strong>Order {order._id.slice(-6).toUpperCase()}</strong>
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      className="retry-button receipt-button"
                      disabled={busyPdf === order._id}
                      onClick={() => exportReceipt(order)}
                    >
                      {busyPdf === order._id ? "Preparing PDF..." : "Download receipt"}
                    </button>
                  </div>
                  <div>
                    <span>{order.items.map((item) => `${item.product?.name || item.productName || "Removed product"} × ${item.quantity}`).join(", ")}</span>
                    <strong>{money(order.total)}</strong>
                  </div>
                  <div className="customer-order-meta">
                    <small className={`status-${order.status}`}>{order.status}</small>
                    <small>{paymentLabels[order.paymentMethod] || paymentLabels.not_recorded}</small>
                    <small className={order.paymentStatus === "paid" ? "payment-paid" : ""}>
                      {order.paymentStatus === "paid"
                        ? `Payment confirmed${order.paymentConfirmedAt ? ` · ${new Date(order.paymentConfirmedAt).toLocaleString()}` : ""}`
                        : "Awaiting payment confirmation"}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
          {pdfError && <div className="notification-error" role="alert">{pdfError}</div>}
        </>
      )}
    </main>
  );
}

export default OrdersPage;
