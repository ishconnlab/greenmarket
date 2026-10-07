import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api.js";
import { apiErrorMessage } from "../utils/apiError.js";
import { money } from "../utils/format.js";
import { downloadAdminOrderReport } from "../utils/orderPdf.js";
import { useLanguage } from "../context/LanguageContext.jsx";

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

const emptyPromotion = {
  eyebrow: "",
  title: "",
  detail: "",
  imageUrl: "",
  imageAlt: "",
  mediaUrl: "",
};

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const paymentLabels = {
  momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_of_kigali: "Bank of Kigali",
  not_recorded: "Not recorded",
};

function getPromotionThumbnail(promotion) {
  if (promotion.imageUrl) return promotion.imageUrl;
  if (!promotion.mediaUrl) return "";
  try {
    const url = new URL(promotion.mediaUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be"
      ? segments[0]
      : url.searchParams.get("v") || (["shorts", "embed", "live"].includes(segments[0]) ? segments[1] : "");
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://img.youtube.com/vi/${id}/mqdefault.jpg`
      : "";
  } catch {
    return "";
  }
}

function AdminPage({ onProductsChanged }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [storeReviewNotes, setStoreReviewNotes] = useState({});
  const [promotions, setPromotions] = useState([]);
  const [promotionDraft, setPromotionDraft] = useState(emptyPromotion);
  const [editingPromotionId, setEditingPromotionId] = useState("");
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyOrder, setBusyOrder] = useState("");
  const [newActivity, setNewActivity] = useState([]);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [exportingReport, setExportingReport] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const seenOrderIds = useRef(null);
  const seenMessageIds = useRef(null);
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.category, product.slug]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [products, productSearch]);
  const reportOrders = useMemo(() => {
    const start = reportStartDate ? new Date(`${reportStartDate}T00:00:00`) : null;
    const end = reportEndDate ? new Date(`${reportEndDate}T23:59:59.999`) : null;
    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return (!start || createdAt >= start)
        && (!end || createdAt <= end)
        && (reportStatus === "all" || order.status === reportStatus);
    });
  }, [orders, reportStartDate, reportEndDate, reportStatus]);
  const reportPaidTotal = reportOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((total, order) => total + order.total, 0);
  const reportOrderValue = reportOrders.reduce((total, order) => total + order.total, 0);

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        refreshOrders(true);
        refreshMessages(true);
      }
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
          setNewActivity((current) => [
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

  async function refreshMessages(notifyNew = false) {
    try {
      const { data } = await api.get("/admin/messages");
      const arrived = notifyNew
        ? data.messages.filter((message) =>
          seenMessageIds.current
          && !seenMessageIds.current.has(message._id)
          && !message.reply
        )
        : [];
      setMessages(data.messages);
      seenMessageIds.current = new Set(data.messages.map((message) => message._id));
      if (arrived.length) {
        setNewActivity((current) => [
          ...arrived.map((message) => `message:${message._id}`),
          ...current,
        ]);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          arrived.forEach((message) => {
            new Notification("New Green Market message", {
              body: `${message.name} sent a ${message.type}.`,
            });
          });
        }
      }
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not check for new customer messages."));
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [productResponse, orderResponse, messageResponse, promotionResponse, storeResponse] = await Promise.all([
        api.get("/products"),
        api.get("/admin/orders"),
        api.get("/admin/messages"),
        api.get("/admin/promotions"),
        api.get("/admin/stores"),
      ]);
      setProducts(productResponse.data.products);
      setOrders(orderResponse.data.orders);
      seenOrderIds.current = new Set(orderResponse.data.orders.map((order) => order._id));
      setMessages(messageResponse.data.messages);
      seenMessageIds.current = new Set(messageResponse.data.messages.map((message) => message._id));
      setPromotions(promotionResponse.data.promotions);
      setStores(storeResponse.data.stores);
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
        setNotice(t("Product updated."));
      } else {
        await api.post("/products", product);
        setNotice(t("Product added."));
      }
      cancelEditing();
      await Promise.all([loadDashboard(), onProductsChanged()]);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not save this product."));
    } finally {
      setSaving(false);
    }
  }

  function startEditingPromotion(promotion) {
    setEditingPromotionId(promotion._id);
    setPromotionDraft({
      eyebrow: promotion.eyebrow,
      title: promotion.title,
      detail: promotion.detail,
      imageUrl: promotion.imageUrl || "",
      imageAlt: promotion.imageAlt || "",
      mediaUrl: promotion.mediaUrl || "",
    });
    document.getElementById("promotion-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelEditingPromotion() {
    setEditingPromotionId("");
    setPromotionDraft(emptyPromotion);
  }

  async function savePromotion(event) {
    event.preventDefault();
    setSavingPromotion(true);
    setError("");
    setNotice("");
    try {
      const { data } = editingPromotionId
        ? await api.patch(`/admin/promotions/${editingPromotionId}`, promotionDraft)
        : await api.post("/admin/promotions", promotionDraft);
      if (editingPromotionId) {
        setPromotions((current) => current.map((item) =>
          item._id === editingPromotionId ? data.promotion : item
        ));
        setNotice(t("Promotion updated."));
      } else {
        setPromotions((current) => [...current, data.promotion].sort((a, b) => a.position - b.position));
        setNotice(t("Promotion added."));
      }
      cancelEditingPromotion();
      window.dispatchEvent(new Event("green-market-promotions-changed"));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not save this promotion."));
    } finally {
      setSavingPromotion(false);
    }
  }

  async function togglePromotion(promotion) {
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/promotions/${promotion._id}`, { active: !promotion.active });
      setPromotions((current) => current.map((item) =>
        item._id === promotion._id ? data.promotion : item
      ));
      setNotice(t(data.promotion.active ? "Promotion published." : "Promotion hidden."));
      window.dispatchEvent(new Event("green-market-promotions-changed"));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not update this promotion."));
    }
  }

  async function deletePromotion(promotion) {
    if (!window.confirm(t("Remove this promotion from the ticker?"))) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/promotions/${promotion._id}`);
      setPromotions((current) => current.filter((item) => item._id !== promotion._id));
      if (editingPromotionId === promotion._id) cancelEditingPromotion();
      setNotice(t("Promotion removed."));
      window.dispatchEvent(new Event("green-market-promotions-changed"));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not remove this promotion."));
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(t("Remove “{name}” from the store?", { name: product.name }))) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/products/${product._id}`);
      if (editingId === product._id) cancelEditing();
      setNotice(t("Product removed."));
      await Promise.all([loadDashboard(), onProductsChanged()]);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not remove this product."));
    }
  }

  async function updateStatus(order, status) {
    if (status === "cancelled" && !window.confirm(t("Cancel this order? Its reserved stock will be returned."))) {
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
      setNotice(t("Order {code} updated.", { code: order._id.slice(-6).toUpperCase() }));
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
      setNotice(t("Payment for order {code} updated.", { code: order._id.slice(-6).toUpperCase() }));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not update payment status."));
    } finally {
      setBusyOrder("");
    }
  }

  async function exportReport() {
    setExportingReport(true);
    setError("");
    try {
      await downloadAdminOrderReport(reportOrders, {
        startDate: reportStartDate,
        endDate: reportEndDate,
        status: reportStatus,
      });
      setNotice(t("Exported a report for {count} orders.", { count: reportOrders.length }));
    } catch (requestError) {
      console.error("Could not export order report:", requestError);
      setError(t("Could not create the order report PDF. Please try again."));
    } finally {
      setExportingReport(false);
    }
  }

  async function sendMessageReply(event, message) {
    event.preventDefault();
    const reply = replyDrafts[message._id] ?? message.reply ?? "";
    setBusyMessage(message._id);
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/messages/${message._id}/reply`, { reply });
      setMessages((current) => current.map((item) =>
        item._id === message._id ? { ...item, ...data.message } : item
      ));
      setReplyDrafts((current) => ({ ...current, [message._id]: "" }));
      setNotice(t("Reply sent to {name}.", { name: message.name }));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not send this reply."));
    } finally {
      setBusyMessage("");
    }
  }

  async function reviewStore(store, status) {
    setError("");
    setNotice("");
    try {
      const { data } = await api.patch(`/admin/stores/${store._id}`, {
        status,
        reviewNote: storeReviewNotes[store._id] ?? store.reviewNote ?? "",
      });
      setStores((current) => current.map((item) =>
        item._id === store._id ? data.store : item
      ));
      setStoreReviewNotes((current) => ({ ...current, [store._id]: data.store.reviewNote || "" }));
      setNotice(t(status === "approved" ? "Store approved." : status === "paused" ? "Store paused." : status === "rejected" ? "Store request rejected." : "Store updated."));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not update this store."));
    }
  }

  async function deleteStore(store) {
    if (!window.confirm(t("Remove {store} and its active products? Historical orders will be kept.", { store: store.name }))) return;
    setError("");
    try {
      await api.delete(`/admin/stores/${store._id}`);
      setStores((current) => current.map((item) =>
        item._id === store._id ? { ...item, status: "removed" } : item
      ));
      setNotice(t("Store removed."));
      await onProductsChanged();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not remove this store."));
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div>
          <span className="eyebrow muted-eyebrow">{t("STORE MANAGEMENT")}</span>
          <h1>{t("Admin dashboard")}</h1>
          <p>{t("Manage your products and keep every order moving.")}</p>
        </div>
        <div className="admin-heading-actions">
          <button
            className="retry-button"
            onClick={enableNotifications}
            disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
          >
            {notificationPermission === "granted"
              ? t("Notifications on")
              : notificationPermission === "unsupported"
                ? t("Notifications unavailable")
                : t("Enable notifications")}
          </button>
          <button className="retry-button" onClick={loadDashboard} disabled={loading}>{t("Refresh")}</button>
        </div>
      </div>

      {error && <div className="admin-message admin-error" role="alert">{error}</div>}
      {notice && <div className="admin-message admin-success" role="status">{notice}</div>}
      {newActivity.length > 0 && (
        <div className="admin-message admin-new-orders" role="status">
          <span>{t("{count} new order or customer message{plural} received.", { count: newActivity.length, plural: newActivity.length === 1 ? "" : "s" })}</span>
          <button onClick={() => setNewActivity([])}>{t("Mark viewed")}</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state">{t("Loading store management...")}</div>
      ) : (
        <>
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="eyebrow muted-eyebrow">{t("MARKETPLACE")}</span><h2>{t("Standalone store requests")}</h2></div>
              <span>{stores.filter((store) => store.status === "pending").length} {t("awaiting review")} · {stores.length} {t("stores")}</span>
            </div>
            {!stores.length ? <div className="empty-state">{t("No standalone store requests yet.")}</div> : (
              <div className="admin-promotion-list">
                {stores.map((store) => (
                  <article className="admin-promotion-row admin-store-row" key={store._id}>
                    {store.logoUrl ? <img src={store.logoUrl} alt="" /> : <span className="admin-promotion-placeholder">{store.name.charAt(0).toUpperCase()}</span>}
                    <div className="admin-promotion-details">
                      <span>{t(store.status)} · {store.category || t("Independent store")}</span>
                      <strong>{store.name}</strong>
                      <small>{store.owner?.name} · {store.owner?.email}</small>
                      <small>{t("Store URL")}: /store/{store.slug}</small>
                      <small>{store.description}</small>
                      {store.reviewNote && <small>{t("Review note")}: {store.reviewNote}</small>}
                      <label className="admin-store-review-field">
                        {t("Review note for seller")}
                        <textarea
                          value={storeReviewNotes[store._id] ?? store.reviewNote ?? ""}
                          onChange={(event) => setStoreReviewNotes((current) => ({
                            ...current,
                            [store._id]: event.target.value,
                          }))}
                          maxLength={1000}
                          rows="2"
                        />
                      </label>
                    </div>
                    <div className="admin-row-actions">
                      {store.status !== "approved" && store.status !== "removed" && <button className="retry-button" onClick={() => reviewStore(store, "approved")}>{t("Approve")}</button>}
                      {store.status === "approved" && <button className="retry-button" onClick={() => reviewStore(store, "paused")}>{t("Pause")}</button>}
                      {store.status === "paused" && <button className="retry-button" onClick={() => reviewStore(store, "approved")}>{t("Resume")}</button>}
                      {store.status === "pending" && <button className="retry-button" onClick={() => reviewStore(store, "rejected")}>{t("Reject")}</button>}
                      {store.status !== "removed" && <button className="retry-button danger-button" onClick={() => deleteStore(store)}>{t("Remove")}</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section" id="promotion-editor">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">{t("MARKET WATCH")}</span>
                <h2>{t(editingPromotionId ? "Edit promotion" : "Manage promotions")}</h2>
                <p className="admin-section-description">{t("Create, update, publish, or remove offers and trending video stories shown under the navigation.")}</p>
              </div>
              <span>{promotions.length} {t("promotions")}</span>
            </div>
            <form className="admin-product-form promotion-form" onSubmit={savePromotion}>
              <label>
                {t("Headline label")}
                <input
                  value={promotionDraft.eyebrow}
                  onChange={(event) => setPromotionDraft({ ...promotionDraft, eyebrow: event.target.value })}
                  maxLength={60}
                  required
                />
              </label>
              <label>
                {t("Promotion title")}
                <input
                  value={promotionDraft.title}
                  onChange={(event) => setPromotionDraft({ ...promotionDraft, title: event.target.value })}
                  maxLength={100}
                  required
                />
              </label>
              <label className="admin-field-wide">
                {t("Short description")}
                <input
                  value={promotionDraft.detail}
                  onChange={(event) => setPromotionDraft({ ...promotionDraft, detail: event.target.value })}
                  maxLength={120}
                  required
                />
              </label>
              <label className="admin-field-wide">
                {t("Image or video thumbnail URL")}
                <input
                  type="url"
                  value={promotionDraft.imageUrl}
                  onChange={(event) => setPromotionDraft({ ...promotionDraft, imageUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label>
                {t("Image description")}
                <input
                  value={promotionDraft.imageAlt}
                  onChange={(event) => setPromotionDraft({ ...promotionDraft, imageAlt: event.target.value })}
                  maxLength={160}
                />
              </label>
              <label className="admin-field-wide">
                {t("YouTube or Instagram video link (optional)")}
                <input
                  type="url"
                  value={promotionDraft.mediaUrl}
                  onChange={(event) => setPromotionDraft({ ...promotionDraft, mediaUrl: event.target.value })}
                  placeholder="https://youtu.be/... or https://www.instagram.com/reel/..."
                />
                <span className="admin-field-hint">{t("Video promotions open in a new tab. YouTube thumbnails are generated automatically; add an image URL for Instagram videos.")}</span>
              </label>
              <div className="admin-form-actions admin-field-wide">
                <button className="primary-button" disabled={savingPromotion}>
                  {savingPromotion ? t("Saving...") : editingPromotionId ? t("Save changes") : t("Publish promotion")}
                </button>
                {editingPromotionId && (
                  <button type="button" className="retry-button" onClick={cancelEditingPromotion}>
                    {t("Cancel edit")}
                  </button>
                )}
              </div>
            </form>
            {!promotions.length ? (
              <div className="empty-state">{t("No promotions yet. Add one above.")}</div>
            ) : (
              <div className="admin-promotion-list">
                {promotions.map((promotion) => (
                  <article className="admin-promotion-row" key={promotion._id}>
                    {getPromotionThumbnail(promotion)
                      ? <img src={getPromotionThumbnail(promotion)} alt={promotion.imageAlt || ""} />
                      : <span className="admin-promotion-placeholder">g</span>}
                    <div className="admin-promotion-details">
                      <span>{promotion.eyebrow}{promotion.mediaUrl ? ` · ${t("Video")}` : ""}</span>
                      <strong>{promotion.title}</strong>
                      <small>{promotion.detail}</small>
                      <small>{promotion.active ? t("Published") : t("Hidden")}</small>
                    </div>
                    <div className="admin-row-actions">
                      <button className="retry-button" onClick={() => togglePromotion(promotion)}>
                        {promotion.active ? t("Hide") : t("Publish")}
                      </button>
                      <button className="retry-button" onClick={() => startEditingPromotion(promotion)}>{t("Edit")}</button>
                      <button className="retry-button danger-button" onClick={() => deletePromotion(promotion)}>{t("Remove")}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section" id="product-editor">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">{t("CATALOG")}</span>
                <h2>{t(editingId ? "Update product" : "Add a product")}</h2>
              </div>
              <span>{products.length} {t("products")}</span>
            </div>
            <form className="admin-product-form" onSubmit={saveProduct}>
              <label>
                {t("Product name")}
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                {t("Category")}
                <input
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  required
                  maxLength={60}
                  placeholder={t("Fruit, Food, Devices...")}
                />
              </label>
              <label>
                {t("Price")}
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
                {t("Stock")}
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
                {t("Description")}
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  rows="4"
                  maxLength={1000}
                  required
                />
                <span className="admin-field-hint">{t("Add useful product-specific details such as size, quantity, materials, ingredients, or how to use it. Customers can read the full description on the product card.")}</span>
              </label>
              <label className="admin-field-wide">
                {t("Product image URL")}
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label>
                {t("Image description")}
                <input
                  value={draft.imageAlt}
                  onChange={(event) => setDraft({ ...draft, imageAlt: event.target.value })}
                  maxLength={200}
                />
              </label>
              <label>
                {t("Slug (optional)")}
                <input
                  value={draft.slug}
                  onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                  maxLength={140}
                />
              </label>
              <div className="admin-form-actions admin-field-wide">
                <button className="primary-button" disabled={saving}>
                  {saving ? t("Saving...") : editingId ? t("Save changes") : t("Add product")}
                </button>
                {editingId && (
                  <button type="button" className="retry-button" onClick={cancelEditing}>
                    {t("Cancel edit")}
                  </button>
                )}
              </div>
            </form>

            <label className="product-search">
              <span>{t("Find a product to update or remove")}</span>
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder={t("Search by product name, category, or slug")}
              />
            </label>
            <div className="admin-product-list">
              {filteredProducts.map((product) => (
                <article className="admin-product-row" key={product._id}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.imageAlt || product.name} loading="lazy" />
                  ) : (
                    <div className="admin-product-placeholder">{product.name.slice(0, 1)}</div>
                  )}
                  <div className="admin-product-details">
                    <strong>{product.name}</strong>
                    <span>{t(product.category)} · {money(product.price)} · {product.stock} {t("in stock")}</span>
                  </div>
                  <div className="admin-row-actions">
                    <button className="retry-button" onClick={() => startEditing(product)}>{t("Edit")}</button>
                    <button className="admin-delete-button" onClick={() => deleteProduct(product)}>{t("Remove")}</button>
                  </div>
                </article>
              ))}
              {products.length > 0 && !filteredProducts.length && (
                <div className="empty-state">{t("No products match “{query}”. Try another search.", { query: productSearch })}</div>
              )}
              {!products.length && <div className="empty-state">{t("No products yet. Add your first one above.")}</div>}
            </div>
          </section>

          <section className="admin-section" id="customer-messages">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">{t("CUSTOMER CARE")}</span>
                <h2>{t("Customer messages")}</h2>
              </div>
              <span>{messages.filter((message) => !message.reply).length} {t("awaiting reply")} · {messages.length} {t("total")}</span>
            </div>
            {!messages.length ? (
              <div className="empty-state">{t("Customer messages and reports will appear here.")}</div>
            ) : (
              <div className="admin-message-list">
                {messages.map((message) => (
                  <article className="admin-customer-message" key={message._id}>
                    <div className="admin-customer-message-heading">
                      <div>
                        <strong>{message.name}</strong>
                        <a href={`mailto:${message.email}`}>{message.email}</a>
                      </div>
                      <div className="admin-message-meta">
                        <span>{t(message.type)}</span>
                        <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                      </div>
                    </div>
                    <p className="admin-customer-message-body">{message.message}</p>
                    {message.reply && message.repliedAt && (
                      <p className="admin-last-reply">
                        {t("Last reply")} · {new Date(message.repliedAt).toLocaleString()}
                      </p>
                    )}
                    <form className="admin-reply-form" onSubmit={(event) => sendMessageReply(event, message)}>
                      <label>
                        {t(message.reply ? "Update reply" : "Write a reply")}
                        <textarea
                          value={replyDrafts[message._id] ?? message.reply ?? ""}
                          onChange={(event) => setReplyDrafts((current) => ({
                            ...current,
                            [message._id]: event.target.value,
                          }))}
                          maxLength={3000}
                          rows="3"
                          required
                          placeholder={t("Write a helpful response. It will appear in the customer’s profile inbox.")}
                        />
                      </label>
                      <button className="primary-button" disabled={busyMessage === message._id}>
                        {busyMessage === message._id ? t("Sending...") : t(message.reply ? "Save reply" : "Send reply")}
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">{t("BUSINESS OVERVIEW")}</span>
                <h2>{t("Order reports")}</h2>
              </div>
              <span>{reportOrders.length} {t("matching orders")}</span>
            </div>
            <div className="report-filters">
              <label>
                {t("From")}
                <input type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} />
              </label>
              <label>
                {t("To")}
                <input type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} />
              </label>
              <label>
                {t("Order status")}
                <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)}>
                  <option value="all">{t("All statuses")}</option>
                  {statuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}
                </select>
              </label>
              <button className="primary-button report-export-button" onClick={exportReport} disabled={exportingReport}>
                {exportingReport ? t("Creating PDF...") : t("Export report PDF")}
              </button>
            </div>
            <div className="report-summary" aria-live="polite">
              <div><span>{t("Matching orders")}</span><strong>{reportOrders.length}</strong></div>
              <div><span>{t("Order value")}</span><strong>{money(reportOrderValue)}</strong></div>
              <div><span>{t("Confirmed paid")}</span><strong>{money(reportPaidTotal)}</strong></div>
            </div>
            <p className="report-privacy-note">The PDF includes customer, item, fulfilment, payment, and date details. Its QR code links back to the admin dashboard.</p>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">{t("FULFILMENT")}</span>
                <h2>{t("All orders")}</h2>
              </div>
              <span>{orders.length} {t("orders")}</span>
            </div>
            {!orders.length ? (
              <div className="empty-state">{t("No orders have been placed yet.")}</div>
            ) : (
              <div className="admin-order-list">
                {orders.map((order) => (
                  <article className="admin-order-card" key={order._id}>
                    <div className="admin-order-topline">
                      <div>
                        <strong>{t("Order {code}", { code: order._id.slice(-6).toUpperCase() })}</strong>
                        <span>{new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                      <label className="admin-status-control">
                        {t("Status")}
                        <select
                          value={order.status}
                          disabled={busyOrder === order._id || order.status === "cancelled"}
                          onChange={(event) => updateStatus(order, event.target.value)}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>{t(status)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="admin-order-customer">
                      <strong>{order.user?.name || t("Customer account unavailable")}</strong>
                      {order.user?.email && <span>{order.user.email}</span>}
                      <span>{order.store?.name || t("Green Market")}</span>
                    </div>
                    <div className="admin-payment-row">
                      <span>{t("Payment:")} {t(paymentLabels[order.paymentMethod] || paymentLabels.not_recorded)}</span>
                      <label>
                        {t("Confirmation")}
                        <select
                          value={order.paymentStatus || "awaiting_confirmation"}
                          disabled={busyOrder === order._id}
                          onChange={(event) => updatePaymentStatus(order, event.target.value)}
                        >
                          <option value="awaiting_confirmation">{t("Awaiting confirmation")}</option>
                          <option value="paid">{t("Paid")}</option>
                        </select>
                      </label>
                    </div>
                    {order.paymentAccount && <p className="admin-order-items">{t("Payment account")}: {order.paymentAccount}</p>}
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
