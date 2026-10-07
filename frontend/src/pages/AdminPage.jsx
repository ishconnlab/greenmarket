import { useEffect, useRef, useState } from "react";
import api from "../api.js";
import { apiErrorMessage } from "../utils/apiError.js";
import { money } from "../utils/format.js";

const emptyProduct = {
  slug: "",
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  imageUrl: "",
  imageAlt: "",
};

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const paymentLabels = {
  momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  not_recorded: "Not recorded",
};

function AdminPage({ onProductsChanged }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyOrder, setBusyOrder] = useState("");
  const [newOrders, setNewOrders] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const seenOrderIds = useRef(null);

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(() => {
      if (!document.hidden) refreshOrders(true);
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function refreshOrders(notifyNew = false) {
    try {
      const { data } = await api.get("/admin/orders");
      const orders = data.orders;
      setOrders(orders);
      const currentIds = new Set(orders.map((order) => order._id));
      if (seenOrderIds.current === null) {
        seenOrderIds.current = currentIds;
      } else {
        const arrived = notifyNew
          ? orders.filter((order) => !seenOrderIds.current.has(order._id))
          : [];
        if (arrived.length) {
          setNewOrders((current) => [
            ...arrived.map((order) => order._id),
            ...current,
          ]);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            arrived.forEach((order) => {
              new Notification("New Green Market order", {
                body: `${order.user?.name || "A customer"} placed order ${order._id.slice(-6).toUpperCase()}.`,
              });
            });
          }
        }
        seenOrderIds.current = new Set([...seenOrderIds.current, ...currentIds]);
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not check for new orders."));
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [productResponse, orderResponse] = await Promise.all([
        api.get("/products"),
        api.get("/admin/orders"),
      ]);
      setProducts(productResponse.data.products);
      setOrders(orderResponse.data.orders);
      seenOrderIds.current = new Set(orderResponse.data.orders.map((order) => order._id));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not load the admin dashboard."));
    } finally {
      setLoading(false);
    }
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotice("Browser notifications enabled. Keep the admin dashboard open to receive new-order alerts.");
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not enable browser notifications."));
    }
  }

  function startEditing(product) {
    setEditingId(product._id);
    setDraft({
      slug: product.slug || "",
      name: product.name || "",
      description: product.description || "",
      price: product.price,
      category: product.category || "",
      stock: product.stock,
      imageUrl: product.imageUrl || "",
      imageAlt: product.imageAlt || "",
    });
    document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingId("");
    setDraft(emptyProduct);
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const product = {
      ...draft,
      slug: draft.slug.trim() || undefined,
      price: Number(draft.price),
      stock: Number(draft.stock),
    };
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, product);
        setNotice("Product updated.");
      } else {
        await api.post("/products", product);
        setNotice("Product added.");
      }
      cancelEditing();
      await Promise.all([loadDashboard(), onProductsChanged()]);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not save this product."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Remove “${product.name}” from the store?`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/products/${product._id}`);
      if (editingId === product._id) cancelEditing();
      setNotice("Product removed.");
      await Promise.all([loadDashboard(), onProductsChanged()]);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not remove this product."));
    }
  }

  async function updateStatus(order, status) {
    if (status === "cancelled" && !window.confirm("Cancel this order? Its reserved stock will be returned.")) {
      return;
    }
    setBusyOrder(order._id);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}`, { status });
      setOrders((current) =>
        current.map((item) => (item._id === order._id ? { ...item, status: data.order.status } : item))
      );
      setNotice(`Order ${order._id.slice(-6).toUpperCase()} updated.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not update this order."));
    } finally {
      setBusyOrder("");
    }
  }

  async function updatePaymentStatus(order, paymentStatus) {
    setBusyOrder(order._id);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/orders/${order._id}`, { paymentStatus });
      setOrders((current) =>
        current.map((item) => (item._id === order._id ? { ...item, paymentStatus: data.order.paymentStatus } : item))
      );
      setNotice(`Payment for order ${order._id.slice(-6).toUpperCase()} updated.`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not update payment status."));
    } finally {
      setBusyOrder("");
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow muted-eyebrow">STORE MANAGEMENT</span>
          <h1>Admin dashboard</h1>
          <p>Manage your products and keep every order moving.</p>
        </div>
        <div className="admin-heading-actions">
          <button
            className="retry-button"
            onClick={enableNotifications}
            disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
          >
            {notificationPermission === "granted"
              ? "Notifications on"
              : notificationPermission === "unsupported"
                ? "Notifications unavailable"
                : "Enable notifications"}
          </button>
          <button className="retry-button" onClick={loadDashboard} disabled={loading}>Refresh</button>
        </div>
      </div>

      {error && <div className="admin-message admin-error" role="alert">{error}</div>}
      {notice && <div className="admin-message admin-success" role="status">{notice}</div>}
      {newOrders.length > 0 && (
        <div className="admin-message admin-new-orders" role="status">
          <span>{newOrders.length} new order{newOrders.length === 1 ? "" : "s"} received.</span>
          <button onClick={() => setNewOrders([])}>Mark viewed</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading store management...</div>
      ) : (
        <>
          <section className="admin-section" id="product-editor">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">CATALOG</span>
                <h2>{editingId ? "Update product" : "Add a product"}</h2>
              </div>
              <span>{products.length} products</span>
            </div>
            <form className="admin-product-form" onSubmit={saveProduct}>
              <label>
                Product name
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Category
                <input
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  required
                  maxLength={60}
                  placeholder="Fruit, Food, Devices..."
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                  required
                />
              </label>
              <label>
                Stock
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.stock}
                  onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
                  required
                />
              </label>
              <label className="admin-field-wide">
                Description
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  rows="2"
                  maxLength={1000}
                />
              </label>
              <label className="admin-field-wide">
                Product image URL
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label>
                Image description
                <input
                  value={draft.imageAlt}
                  onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })}
                  maxLength={200}
                />
              </label>
              <label>
                Slug (optional)
                <input
                  value={draft.slug}
                  onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                  maxLength={140}
                />
              </label>
              <div className="admin-form-actions admin-field-wide">
                <button className="primary-button" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
                </button>
                {editingId && (
                  <button type="button" className="retry-button" onClick={cancelEditing}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>

            <div className="admin-product-list">
              {products.map((product) => (
                <article className="admin-product-row" key={product._id}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.imageAlt || product.name} loading="lazy" />
                  ) : (
                    <div className="admin-product-placeholder">{product.name.slice(0, 1)}</div>
                  )}
                  <div className="admin-product-details">
                    <strong>{product.name}</strong>
                    <span>{product.category} · {money(product.price)} · {product.stock} in stock</span>
                  </div>
                  <div className="admin-row-actions">
                    <button className="retry-button" onClick={() => startEditing(product)}>Edit</button>
                    <button className="admin-delete-button" onClick={() => deleteProduct(product)}>Remove</button>
                  </div>
                </article>
              ))}
              {!products.length && <div className="empty-state">No products yet. Add your first one above.</div>}
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">FULFILMENT</span>
                <h2>All orders</h2>
              </div>
              <span>{orders.length} orders</span>
            </div>
            {!orders.length ? (
              <div className="empty-state">No orders have been placed yet.</div>
            ) : (
              <div className="admin-order-list">
                {orders.map((order) => (
                  <article className="admin-order-card" key={order._id}>
                    <div className="admin-order-topline">
                      <div>
                        <strong>Order {order._id.slice(-6).toUpperCase()}</strong>
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                      <label className="admin-status-control">
                        Status
                        <select
                          value={order.status}
                          disabled={busyOrder === order._id || order.status === "cancelled"}
                          onChange={(event) => updateStatus(order, event.target.value)}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="admin-order-customer">
                      <strong>{order.user?.name || "Customer account unavailable"}</strong>
                      {order.user?.email && <span>{order.user.email}</span>}
                    </div>
                    <div className="admin-payment-row">
                      <span>Payment: {paymentLabels[order.paymentMethod] || paymentLabels.not_recorded}</span>
                      <label>
                        Confirmation
                        <select
                          value={order.paymentStatus || "awaiting_confirmation"}
                          disabled={busyOrder === order._id}
                          onChange={(event) => updatePaymentStatus(order, event.target.value)}
                        >
                          <option value="awaiting_confirmation">Awaiting confirmation</option>
                          <option value="paid">Paid</option>
                        </select>
                      </label>
                    </div>
                    <p className="admin-order-items">
                      {order.items.map((item) =>
                        `${item.product?.name || item.productName || "Removed product"} × ${item.quantity}`
                      ).join(", ")}
                    </p>
                    <div className="admin-order-bottom">
                      <span>{order.address}</span>
                      <strong>{money(order.total)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default AdminPage;
