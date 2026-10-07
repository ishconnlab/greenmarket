import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
import { apiErrorMessage } from "./utils/apiError.js";

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("green-market-user")) || null;
  } catch {
    return null;
  }
}

function App() {
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
  const noticeTimeout = useRef(null);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCart([]);
    }
  }, [user]);

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

  async function loadCart() {
    try {
      const { data } = await api.get("/cart");
      setCart(data.cart);
    } catch (error) {
      if (error.response?.status === 401) {
        signOut(false);
        showNotice("Your session expired. Please sign in again.");
      } else {
        showNotice(apiErrorMessage(error, "Could not load your cart."));
      }
    }
  }

  async function addToCart(product) {
    if (!user) {
      setAuthMode("login");
      showNotice("Sign in to add items to your cart.");
      return;
    }
    try {
      const { data } = await api.post(`/cart/${product._id}`);
      setCart(data.cart);
      showNotice(`${product.name} added to your cart.`);
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not add item to cart."));
    }
  }

  async function updateQuantity(productId, quantity) {
    try {
      const { data } = await api.patch(`/cart/${productId}`, { quantity });
      setCart(data.cart);
    } catch (error) {
      showNotice(apiErrorMessage(error, "Could not update quantity."));
    }
  }

  async function removeFromCart(productId) {
    try {
      const { data } = await api.delete(`/cart/${productId}`);
      setCart(data.cart);
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
      showNotice(`Welcome${data.user.name ? `, ${data.user.name}` : ""}!`);
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
      const { data } = await api.post("/orders", { address, paymentMethod });
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
          path="/admin"
          element={
            user?.role === "admin" ? (
              <AdminPage onProductsChanged={loadProducts} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
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
