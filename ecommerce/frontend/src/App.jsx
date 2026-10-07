import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("green-market-user")) || null;
  } catch {
    return null;
  }
}

function App() {
  const { t } = useLanguage();
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
        <Route path="/store/:slug" element={<StorefrontPage onStoreLoaded={setActiveStore} onAddToCart={addToCart} />} />
        <Route path="/seller" element={<SellerDashboardPage user={user} onSignIn={() => setAuthMode("login")} />} />
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
      {notice && <Toast message={notice} />}
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
