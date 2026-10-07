import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import api from "./api.js";
import AuthDialog from "./components/AuthDialog.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import PaymentDialog from "./components/PaymentDialog.jsx";
import Toast from "./components/Toast.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import InfoPage from "./pages/InfoPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import StorefrontPage from "./pages/StorefrontPage.jsx";
import SellerDashboardPage from "./pages/SellerDashboardPage.jsx";
import { apiErrorMessage } from "./utils/apiError.js";
import { useLanguage } from "./context/LanguageContext.jsx";

function AppNavIcon({ name }) {
  const paths = {
    shop: <><path d="M3 10.5 5.2 4h13.6l2.2 6.5" /><path d="M4 10v9h16v-9" /><path d="M3 10.5c.3 1.4 1.2 2.2 2.5 2.2s2.2-.8 2.5-2.2c.3 1.4 1.2 2.2 2.5 2.2s2.2-.8 2.5-2.2c.3 1.4 1.2 2.2 2.5 2.2s2.2-.8 2.5-2.2c.3 1.4 1.2 2.2 2.5 2.2" /><path d="M9 19v-4h6v4" /></>,
    orders: <><path d="M7 3.8h8l3 3V20H7z" /><path d="M15 4v3h3M10 11h5M10 14h5M10 17h3" /></>,
    bag: <><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M9 12v1M15 12v1" /></>,
    seller: <><path d="M3 10.5 5.2 4h13.6l2.2 6.5" /><path d="M4 10v10h16V10" /><path d="M3 10.5c.3 1.4 1.2 2.2 2.5 2.2s2.2-.8 2.5-2.2c.3 1.4 1.2 2.2 2.5 2.2s2.2-.8 2.5-2.2c.3 1.4 1.2 2.2 2.5 2.2s2.2-.8 2.5-2.2c.3 1.4 1.2 2.2 2.5 2.2" /><path d="M9 20v-4h6v4" /></>,
    profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.5-3.1 2.8-5 6.5-5s6 1.9 6.5 5" /></>,
    admin: <><path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    signIn: <><path d="M13 4h6v16h-6" /><path d="M3 12h11M10 8l4 4-4 4" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("green-market-user")) || null;
  } catch {
    return null;
  }
}

function updateMetaTag(attribute, key, content) {
  let tag = Array.from(document.head.querySelectorAll(`meta[${attribute}]`))
    .find((item) => item.getAttribute(attribute) === key);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.append(tag);
  }
  tag.setAttribute("content", content);
}

function App() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const storeSlug = location.pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(getSavedUser);
  const [authMode, setAuthMode] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [notice, setNotice] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeStore, setActiveStore] = useState(null);
  const noticeTimeout = useRef(null);
  const cartLoadSequence = useRef(0);
  const cartScopeRef = useRef(storeSlug ? `store:${storeSlug}` : "main");
  cartScopeRef.current = storeSlug ? `store:${storeSlug}` : "main";

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const syncStandaloneClass = () => {
      const standalone = standaloneQuery.matches || window.navigator.standalone === true;
      document.documentElement.classList.toggle("pwa-standalone", standalone);
    };
    syncStandaloneClass();
    standaloneQuery.addEventListener("change", syncStandaloneClass);
    return () => {
      standaloneQuery.removeEventListener("change", syncStandaloneClass);
      document.documentElement.classList.remove("pwa-standalone");
    };
  }, []);

  useEffect(() => {
    const publicOrigin = "https://greenmarket-livid.vercel.app";
    const routeContent = {
      "/": {
        title: "Green Market Rwanda | Shop Fresh Finds Online",
        description: "Shop fresh fruit, pantry essentials, home goods and everyday products online. Discover local stores and market favourites in Kabuga, Rwanda.",
      },
      "/help": {
        title: "Help Centre | Green Market Rwanda",
        description: "Get help with your Green Market account, orders, payments, delivery, and shopping in Rwanda.",
      },
      "/guide": {
        title: "Shopping Guide | Green Market Rwanda",
        description: "Learn how to browse Green Market, place an order, choose a payment method, and track your order.",
      },
      "/policies": {
        title: "Store Policies | Green Market Rwanda",
        description: "Read Green Market policies for ordering, payments, delivery, cancellations, and customer support.",
      },
      "/privacy": {
        title: "Privacy Policy | Green Market Rwanda",
        description: "Learn how Green Market handles account, order, and contact information and protects customer privacy.",
      },
    };
    const isStorePage = /^\/store\/[^/]+$/.test(location.pathname);
    const productId = new URLSearchParams(location.search).get("product");
    const selectedProduct = products.find((product) =>
      product._id === productId || product.slug === productId
    );
    let metadata = routeContent[location.pathname] || {
      title: "Green Market Rwanda | Local Online Marketplace",
      description: "Shop everyday products and discover independent stores at Green Market Rwanda.",
    };
    if (isStorePage && activeStore?.slug === storeSlug) {
      metadata = {
        title: `${activeStore.name} | Green Market Rwanda`,
        description: activeStore.description || `Shop products from ${activeStore.name} on Green Market Rwanda.`,
      };
    }
    if (selectedProduct) {
      metadata = {
        title: `${selectedProduct.name} | Green Market Rwanda`,
        description: [selectedProduct.description, `Shop online at Green Market Rwanda.`]
          .filter(Boolean)
          .join(" "),
      };
    }

    const publicPage = location.pathname === "/"
      || Object.hasOwn(routeContent, location.pathname)
      || (isStorePage && activeStore?.slug === storeSlug);
    const canonical = selectedProduct
      ? new URL(`/products/${selectedProduct._id}`, publicOrigin)
      : new URL(location.pathname, publicOrigin);
    if (productId && publicPage && !selectedProduct) canonical.searchParams.set("product", productId);
    const imageUrl = selectedProduct?.imageUrl?.match(/^https?:\/\//i)
      ? selectedProduct.imageUrl
      : `${publicOrigin}/social-card.png`;

    document.title = metadata.title;
    document.documentElement.lang = language === "rw" ? "rw" : "en";
    updateMetaTag("name", "description", metadata.description.slice(0, 300));
    updateMetaTag("name", "robots", publicPage ? "index,follow,max-image-preview:large" : "noindex,nofollow");
    updateMetaTag("property", "og:type", "website");
    updateMetaTag("property", "og:site_name", "Green Market Rwanda");
    updateMetaTag("property", "og:title", metadata.title);
    updateMetaTag("property", "og:description", metadata.description.slice(0, 300));
    updateMetaTag("property", "og:url", canonical.href);
    updateMetaTag("property", "og:image", imageUrl);
    updateMetaTag("property", "og:image:alt", selectedProduct?.imageAlt || metadata.title);
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", metadata.title);
    updateMetaTag("name", "twitter:description", metadata.description.slice(0, 300));
    updateMetaTag("name", "twitter:image", imageUrl);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.append(canonicalLink);
    }
    canonicalLink.href = canonical.href;
  }, [activeStore?.description, activeStore?.name, activeStore?.slug, language, location.pathname, location.search, products, storeSlug]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!storeSlug) {
      setActiveStore(null);
    } else if (activeStore?.slug !== storeSlug) {
      setActiveStore(null);
      setCart([]);
    }
  }, [storeSlug, activeStore?.slug]);

  useEffect(() => {
    if (!user) {
      cartLoadSequence.current += 1;
      setCart([]);
      return;
    }
    if (!storeSlug || activeStore?.slug === storeSlug) {
      loadCart(activeStore);
    } else {
      setCart([]);
    }
  }, [user?.id, storeSlug, activeStore?.id]);

  useEffect(() => () => window.clearTimeout(noticeTimeout.current), []);

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(noticeTimeout.current);
    noticeTimeout.current = window.setTimeout(() => setNotice(""), 3500);
  }

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");
    try {
      const { data } = await api.get("/products");
      setProducts(data.products);
    } catch (error) {
      setProductsError(apiErrorMessage(error, "Could not load products."));
    } finally {
      setProductsLoading(false);
    }
  }

  function storeQuery(store = activeStore) {
    return store?._id || store?.id ? `?storeId=${encodeURIComponent(store._id || store.id)}` : "";
  }

  async function loadCart(store = activeStore) {
    const requestSequence = ++cartLoadSequence.current;
    const requestScope = cartScopeRef.current;
    try {
      const { data } = await api.get(`/cart${storeQuery(store)}`);
      if (requestSequence === cartLoadSequence.current && requestScope === cartScopeRef.current) {
        setCart(data.cart);
      }
    } catch (error) {
      if (requestSequence !== cartLoadSequence.current || requestScope !== cartScopeRef.current) return;
      if (error.response?.status === 401) {
        signOut(false);
        showNotice(t("Your session expired. Please sign in again."));
      } else {
        showNotice(apiErrorMessage(error, "Could not load your cart."));
      }
    }
  }

  async function addToCart(product) {
    if (product.store?.slug && activeStore?.slug !== product.store.slug) {
      navigate(`/store/${product.store.slug}`);
      showNotice(t("Open {store} to order its products separately.", { store: product.store.name }));
      return;
    }
    if (!user) {
      setAuthMode("login");
      showNotice("Sign in to add items to your cart.");
      return;
    }
    const requestScope = cartScopeRef.current;
    try {
      const { data } = await api.post(`/cart/${product._id}${storeQuery()}`);
      if (requestScope === cartScopeRef.current) setCart(data.cart);
      showNotice(t("{name} added to your cart.", { name: product.name }));
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not add item to cart."));
    }
  }

  async function updateQuantity(productId, quantity) {
    const requestScope = cartScopeRef.current;
    try {
      const { data } = await api.patch(`/cart/${productId}${storeQuery()}`, { quantity });
      if (requestScope === cartScopeRef.current) setCart(data.cart);
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not update quantity."));
    }
  }

  async function removeFromCart(productId) {
    const requestScope = cartScopeRef.current;
    try {
      const { data } = await api.delete(`/cart/${productId}${storeQuery()}`);
      if (requestScope === cartScopeRef.current) setCart(data.cart);
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not remove item."));
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (authMode === "register") {
        await api.post("/register", payload);
      }
      const { data } = await api.post("/login", {
        email: payload.email,
        password: payload.password,
      });
      localStorage.setItem("green-market-token", data.token);
      localStorage.setItem("green-market-user", JSON.stringify(data.user));
      setUser(data.user);
      setAuthMode("");
      showNotice(t("Welcome{suffix}!", { suffix: data.user.name ? `, ${data.user.name}` : "" }));
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not sign in. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  function signOut(showMessage = true) {
    localStorage.removeItem("green-market-token");
    localStorage.removeItem("green-market-user");
    setUser(null);
    if (showMessage) showNotice("You have signed out.");
  }

  async function checkout(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const address = form.get("address");
      const paymentMethod = form.get("paymentMethod");
      const paymentAccount = form.get("paymentAccount");
      const { data } = await api.post("/orders", {
        address,
        paymentMethod,
        paymentAccount,
        ...(activeStore ? { storeId: activeStore._id || activeStore.id } : {}),
      });
      await Promise.all([loadCart(), loadProducts()]);
      setCartOpen(false);
      setPaymentOrder(data.order);
      showNotice("Order placed. Continue with payment.");
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not place your order."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        isAdmin={user?.role === "admin"}
        isSeller={user?.role === "seller"}
        store={activeStore}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onSignIn={() => setAuthMode("login")}
        onSignOut={signOut}
      />
      <Routes>
        <Route
          path="/"
          element={
            <ShopPage
              products={products}
              loading={productsLoading}
              error={productsError}
              onRetry={loadProducts}
              onAddToCart={addToCart}
              onNotice={showNotice}
            />
          }
        />
        <Route
          path="/orders"
          element={<OrdersPage user={user} onSignIn={() => setAuthMode("login")} />}
        />
        <Route
          path="/profile"
          element={<ProfilePage user={user} onSignIn={() => setAuthMode("login")} onSignOut={signOut} />}
        />
        <Route path="/help" element={<InfoPage page="help" />} />
        <Route path="/guide" element={<InfoPage page="guide" />} />
        <Route path="/policies" element={<InfoPage page="policies" />} />
        <Route path="/privacy" element={<InfoPage page="privacy" />} />
        <Route path="/store/:slug" element={<StorefrontPage onStoreLoaded={setActiveStore} onAddToCart={addToCart} onNotice={showNotice} />} />
        <Route
          path="/seller"
          element={user?.role === "admin"
            ? <Navigate to="/admin" replace />
            : <SellerDashboardPage user={user} onSignIn={() => setAuthMode("login")} />}
        />
        <Route
          path="/admin"
          element={
            user?.role === "admin" ? (
              <AdminPage onProductsChanged={loadProducts} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Footer />
      <nav className={`mobile-tab-bar${user && (user.role === "admin" || user.role === "seller") ? " mobile-tab-bar-wide" : ""}${user?.role === "admin" ? " mobile-tab-bar-admin" : ""}`} aria-label={t("App navigation")}>
        <NavLink to="/" end aria-label={t("Shop")}>
          <span className="mobile-tab-icon"><AppNavIcon name="shop" /></span>
          <span>{t("Shop")}</span>
        </NavLink>
        {user
          ? (
            <NavLink to="/orders" aria-label={t("Orders")}>
              <span className="mobile-tab-icon"><AppNavIcon name="orders" /></span>
              <span>{t("Orders")}</span>
            </NavLink>
          )
          : (
            <NavLink to="/seller" aria-label={t("Sell with us")}>
              <span className="mobile-tab-icon"><AppNavIcon name="seller" /></span>
              <span>{t("Sell with us")}</span>
            </NavLink>
          )}
        <button type="button" className="mobile-cart-tab" onClick={() => setCartOpen(true)} aria-label={t("Open cart, {count} items", { count: cartCount })}>
          <span className="mobile-tab-icon mobile-cart-icon"><AppNavIcon name="bag" /></span>
          <span>{t("Your bag")}</span>
          {cartCount > 0 && <span className="mobile-cart-count">{cartCount}</span>}
        </button>
        {user?.role === "admin" && (
          <NavLink to="/admin" aria-label={t("Admin")}>
            <span className="mobile-tab-icon"><AppNavIcon name="admin" /></span>
            <span>{t("Admin")}</span>
          </NavLink>
        )}
        {user?.role === "seller" && (
          <NavLink to="/seller" aria-label={t("My store")}>
            <span className="mobile-tab-icon"><AppNavIcon name="seller" /></span>
            <span>{t("My store")}</span>
          </NavLink>
        )}
        {user ? (
          <NavLink to="/profile" aria-label={t("Profile")}>
            <span className="mobile-tab-icon"><AppNavIcon name="profile" /></span>
            <span>{t("Profile")}</span>
          </NavLink>
        ) : (
          <button type="button" onClick={() => setAuthMode("login")} aria-label={t("Sign in")}>
            <span className="mobile-tab-icon"><AppNavIcon name="signIn" /></span>
            <span>{t("Sign in")}</span>
          </button>
        )}
      </nav>
      {notice && <Toast key={notice} message={notice} />}
      {authMode && (
        <AuthDialog
          mode={authMode}
          busy={busy}
          onClose={() => setAuthMode("")}
          onModeChange={setAuthMode}
          onSubmit={submitAuth}
        />
      )}
      {paymentOrder && (
        <PaymentDialog order={paymentOrder} onClose={() => setPaymentOrder(null)} />
      )}
      {cartOpen && (
        <CartDrawer
          user={user}
          store={activeStore}
          cart={cart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          busy={busy}
          onClose={() => setCartOpen(false)}
          onSignIn={() => {
            setCartOpen(false);
            setAuthMode("login");
          }}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={checkout}
        />
      )}
    </div>
  );
}

export default App;
