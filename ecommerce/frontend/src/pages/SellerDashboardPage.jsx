import { useEffect, useState } from "react";
import api from "../api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { apiErrorMessage } from "../utils/apiError.js";
import { money } from "../utils/format.js";

const emptyStore = {
  name: "",
  slug: "",
  description: "",
  category: "",
  phone: "",
  contactEmail: "",
  address: "",
  logoUrl: "",
  bannerUrl: "",
};
const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  imageUrl: "",
  imageAlt: "",
};
const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];

function SellerDashboardPage({ user, onSignIn }) {
  const { t } = useLanguage();
  const [store, setStore] = useState(null);
  const [storeDraft, setStoreDraft] = useState(emptyStore);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productDraft, setProductDraft] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [busyOrder, setBusyOrder] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return () => { active = false; };
    }
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/stores/mine");
        if (!active) return;
        setStore(data.store);
        setStoreDraft(data.store
          ? Object.fromEntries(Object.keys(emptyStore).map((key) => [key, data.store[key] || ""]))
          : emptyStore);
        if (data.store?.status === "approved" || data.store?.status === "paused") {
          const [productResponse, orderResponse] = await Promise.all([
            api.get("/seller/products"),
            api.get("/seller/orders"),
          ]);
          if (!active) return;
          setProducts(productResponse.data.products);
          setOrders(orderResponse.data.orders);
        } else {
          setProducts([]);
          setOrders([]);
        }
      } catch (requestError) {
        console.error("Could not load seller dashboard:", requestError);
        if (active) setError(apiErrorMessage(requestError, "Could not load your seller dashboard."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [user?.id]);

  async function saveStore(event) {
    event.preventDefault();
    setSavingStore(true);
    setError("");
    setNotice("");
    try {
      const { data } = store && store.status !== "removed"
        ? await api.patch("/stores/mine", storeDraft)
        : await api.post("/stores/apply", storeDraft);
      setStore(data.store);
      setNotice(t(data.store.status === "pending" ? "Store request sent for review." : "Store details saved."));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not save store details."));
    } finally {
      setSavingStore(false);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSavingProduct(true);
    setError("");
    setNotice("");
    const body = {
      ...productDraft,
      price: Number(productDraft.price),
      stock: Number(productDraft.stock),
    };
    try {
      if (editingProductId) {
        const { data } = await api.patch(`/seller/products/${editingProductId}`, body);
        setProducts((current) => current.map((product) =>
          product._id === editingProductId ? data.product : product
        ));
        setNotice(t("Product updated."));
      } else {
        const { data } = await api.post("/seller/products", body);
        setProducts((current) => [data.product, ...current]);
        setNotice(t("Product added."));
      }
      setProductDraft(emptyProduct);
      setEditingProductId("");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not save this product."));
    } finally {
      setSavingProduct(false);
    }
  }

  function startEditingProduct(product) {
    setEditingProductId(product._id);
    setProductDraft(Object.fromEntries(
      Object.keys(emptyProduct).map((key) => [key, product[key] ?? ""])
    ));
    document.getElementById("seller-product-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  async function removeProduct(product) {
    if (!window.confirm(t("Remove “{name}” from your store?", { name: product.name }))) return;
    setError("");
    try {
      await api.delete(`/seller/products/${product._id}`);
      setProducts((current) => current.filter((item) => item._id !== product._id));
      if (editingProductId === product._id) {
        setEditingProductId("");
        setProductDraft(emptyProduct);
      }
      setNotice(t("Product removed."));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not remove this product."));
    }
  }

  async function updateOrder(order, changes) {
    setBusyOrder(order._id);
    setError("");
    try {
      const { data } = await api.patch(`/seller/orders/${order._id}`, changes);
      setOrders((current) => current.map((item) =>
        item._id === order._id ? { ...item, ...data.order } : item
      ));
      setNotice(t("Order updated."));
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not update this order."));
    } finally {
      setBusyOrder("");
    }
  }

  if (loading) return <main className="seller-dashboard"><div className="empty-state">{t("Loading seller dashboard...")}</div></main>;
  if (!user) {
    return (
      <main className="seller-dashboard">
        <section className="seller-panel">
          <span className="eyebrow muted-eyebrow">{t("SELL WITH GREEN MARKET")}</span>
          <h1>{t("Open your own store")}</h1>
          <p>{t("Sign in to submit a store request. Green Market reviews every application before the store goes live.")}</p>
          <button className="primary-button" onClick={onSignIn}>{t("Sign in")}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="seller-dashboard">
      <span className="eyebrow muted-eyebrow">{t("SELLER WORKSPACE")}</span>
      <h1>{t("Your standalone store")}</h1>
      <p className="seller-dashboard-intro">{t("Manage your independent Green Market shop, products, and customer orders.")}</p>
      {error && <div className="admin-message admin-error" role="alert">{error}</div>}
      {notice && <div className="admin-message admin-success" role="status">{notice}</div>}

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <span className={`seller-status-pill seller-status-${store?.status || "new"}`}>
              {t(store?.status || "Not applied")}
            </span>
            <h2>{t(store && store.status !== "removed" ? "Store profile and settings" : "Apply to open a store")}</h2>
          </div>
          {store?.status === "approved" && <a className="storefront-main-link" href={`/store/${store.slug}`} target="_blank" rel="noreferrer">{t("Open my store")} ↗</a>}
        </div>
        {store?.reviewNote && (
          <p className="seller-review-note"><strong>{t("Green Market review")}</strong> · {store.reviewNote}</p>
        )}
        {store?.status === "pending" && (
          <p className="seller-review-note">{t("Your request is waiting for Green Market approval.")}</p>
        )}
        {store?.status === "paused" && (
          <p className="seller-review-note">{t("Your store is paused by Green Market. You can view orders and update store details, but products are hidden until it is approved again.")}</p>
        )}
        <form className="admin-product-form seller-store-form" onSubmit={saveStore}>
          <label>{t("Store name")}<input value={storeDraft.name} onChange={(event) => setStoreDraft({ ...storeDraft, name: event.target.value })} maxLength={100} required /></label>
          <label>{t("Store URL name")}<input value={storeDraft.slug} onChange={(event) => setStoreDraft({ ...storeDraft, slug: event.target.value })} placeholder="my-store" maxLength={60} required /><span className="admin-field-hint">greenmarket-livid.vercel.app/store/{storeDraft.slug || "my-store"}</span></label>
          <label>{t("Store category")}<input value={storeDraft.category} onChange={(event) => setStoreDraft({ ...storeDraft, category: event.target.value })} maxLength={80} /></label>
          <label>{t("Contact phone")}<input value={storeDraft.phone} onChange={(event) => setStoreDraft({ ...storeDraft, phone: event.target.value })} maxLength={32} /></label>
          <label>{t("Store email")}<input type="email" value={storeDraft.contactEmail} onChange={(event) => setStoreDraft({ ...storeDraft, contactEmail: event.target.value })} maxLength={254} /></label>
          <label>{t("Store address")}<input value={storeDraft.address} onChange={(event) => setStoreDraft({ ...storeDraft, address: event.target.value })} maxLength={240} /></label>
          <label className="admin-field-wide">{t("Store description")}<textarea value={storeDraft.description} onChange={(event) => setStoreDraft({ ...storeDraft, description: event.target.value })} rows="3" maxLength={1200} required /></label>
          <label>{t("Store logo image URL")}<input type="url" value={storeDraft.logoUrl} onChange={(event) => setStoreDraft({ ...storeDraft, logoUrl: event.target.value })} placeholder="https://..." /></label>
          <label>{t("Store banner image URL")}<input type="url" value={storeDraft.bannerUrl} onChange={(event) => setStoreDraft({ ...storeDraft, bannerUrl: event.target.value })} placeholder="https://..." /></label>
          {(!store || ["pending", "rejected", "removed"].includes(store.status)) && (
            <div className="admin-form-actions admin-field-wide">
              <button className="primary-button" disabled={savingStore}>
                {savingStore ? t("Saving...") : store && store.status !== "removed" ? t("Update and resubmit") : t("Submit store request")}
              </button>
            </div>
          )}
          {store && !["pending", "rejected", "removed"].includes(store.status) && (
            <div className="admin-form-actions admin-field-wide">
              <button className="primary-button" disabled={savingStore}>{savingStore ? t("Saving...") : t("Save store settings")}</button>
            </div>
          )}
        </form>
      </section>

      {(store?.status === "approved" || store?.status === "paused") && (
        <>
          <section className="seller-panel">
            <div className="seller-panel-heading">
              <div><span className="eyebrow muted-eyebrow">{t("STORE CATALOG")}</span><h2>{t(editingProductId ? "Edit product" : "Add a product")}</h2></div>
              <span>{products.length} {t("products")}</span>
            </div>
            <form className="admin-product-form seller-store-form" onSubmit={saveProduct} id="seller-product-editor">
              <label>{t("Product name")}<input value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} required maxLength={120} /></label>
              <label>{t("Category")}<input value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} maxLength={60} /></label>
              <label>{t("Price")}<input type="number" min="0" step="1" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: event.target.value })} required /></label>
              <label>{t("Stock")}<input type="number" min="0" step="1" value={productDraft.stock} onChange={(event) => setProductDraft({ ...productDraft, stock: event.target.value })} required /></label>
              <label className="admin-field-wide">{t("Description")}<textarea value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} rows="3" maxLength={1000} required /><span className="admin-field-hint">{t("Add size, quantity, ingredients, materials, or usage details.")}</span></label>
              <label className="admin-field-wide">{t("Product image URL")}<input type="url" value={productDraft.imageUrl} onChange={(event) => setProductDraft({ ...productDraft, imageUrl: event.target.value })} placeholder="https://..." /></label>
              <label>{t("Image description")}<input value={productDraft.imageAlt} onChange={(event) => setProductDraft({ ...productDraft, imageAlt: event.target.value })} maxLength={200} /></label>
              <label>{t("Slug (optional)")}<input value={productDraft.slug} onChange={(event) => setProductDraft({ ...productDraft, slug: event.target.value })} maxLength={140} /></label>
              <div className="admin-form-actions admin-field-wide">
                <button className="primary-button" disabled={savingProduct}>{savingProduct ? t("Saving...") : editingProductId ? t("Save changes") : t("Add product")}</button>
                {editingProductId && <button type="button" className="retry-button" onClick={() => { setEditingProductId(""); setProductDraft(emptyProduct); }}>{t("Cancel edit")}</button>}
              </div>
            </form>
            <div className="admin-product-list">
              {products.map((product) => (
                <article className="admin-product-row" key={product._id}>
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || ""} /> : <span className="admin-product-placeholder">g</span>}
                  <div className="admin-product-details"><strong>{product.name}</strong><span>{money(product.price)} · {t("Stock")}: {product.stock}</span></div>
                  <div className="admin-row-actions"><button className="retry-button" onClick={() => startEditingProduct(product)}>{t("Edit")}</button><button className="retry-button danger-button" onClick={() => removeProduct(product)}>{t("Remove")}</button></div>
                </article>
              ))}
            </div>
          </section>

          <section className="seller-panel">
            <div className="seller-panel-heading"><div><span className="eyebrow muted-eyebrow">{t("CUSTOMER ORDERS")}</span><h2>{t("Orders for {store}", { store: store.name })}</h2></div><span>{orders.length} {t("orders")}</span></div>
            {!orders.length ? <div className="empty-state">{t("No orders have been placed for your store yet.")}</div> : (
              <div className="admin-order-list">
                {orders.map((order) => (
                  <article className="admin-order-card" key={order._id}>
                    <div className="admin-order-topline"><div><strong>{t("Order {code}", { code: order._id.slice(-6).toUpperCase() })}</strong><span>{new Date(order.createdAt).toLocaleString()}</span></div><label className="admin-status-control">{t("Status")}<select value={order.status} disabled={busyOrder === order._id || order.status === "cancelled"} onChange={(event) => updateOrder(order, { status: event.target.value })}>{orderStatuses.map((status) => <option key={status} value={status}>{t(status)}</option>)}</select></label></div>
                    <div className="admin-order-customer"><strong>{order.user?.name || t("Customer account unavailable")}</strong>{order.user?.email && <span>{order.user.email}</span>}</div>
                    <p className="admin-order-items">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(" · ")}</p>
                    <div className="admin-payment-row"><span>{t("Payment:")} {t(({ momo: "MTN MoMo", airtel_money: "Airtel Money", bank_of_kigali: "Bank of Kigali" })[order.paymentMethod] || "Payment not recorded")} · {money(order.total)}</span><label>{t("Confirmation")}<select value={order.paymentStatus} disabled={busyOrder === order._id} onChange={(event) => updateOrder(order, { paymentStatus: event.target.value })}><option value="awaiting_confirmation">{t("Awaiting confirmation")}</option><option value="paid">{t("Paid")}</option></select></label></div>
                    {order.paymentAccount && <p className="admin-order-items">{t("Payment account")}: {order.paymentAccount}</p>}
                    <p className="seller-delivery-address"><strong>{t("Delivery address")}:</strong> {order.address}</p>
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

export default SellerDashboardPage;
