import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api.js";
import ProductCard from "../components/ProductCard.jsx";
import BrandedLoader from "../components/BrandedLoader.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { apiErrorMessage } from "../utils/apiError.js";

function StorefrontPage({ onStoreLoaded, onAddToCart, onNotice }) {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const sharedProductId = searchParams.get("product");
  const { t } = useLanguage();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("green-market-favorites")) || [];
    } catch {
      return [];
    }
  });

  function toggleFavorite(productId) {
    setFavorites((current) => {
      const updated = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      localStorage.setItem("green-market-favorites", JSON.stringify(updated));
      return updated;
    });
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setStore(null);
    setProducts([]);

    Promise.all([
      api.get(`/stores/${encodeURIComponent(slug)}`),
      api.get(`/stores/${encodeURIComponent(slug)}/products`),
    ])
      .then(([storeResponse, productResponse]) => {
        if (!active) return;
        setStore(storeResponse.data.store);
        setProducts(productResponse.data.products);
        onStoreLoaded(storeResponse.data.store);
      })
      .catch((requestError) => {
        console.error("Could not load standalone storefront:", requestError);
        if (active) setError(apiErrorMessage(requestError, "Could not load this store."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, onStoreLoaded]);

  if (loading) {
    return <main className="storefront-page"><BrandedLoader label={t("Loading store...")} /></main>;
  }
  if (error || !store) {
    return (
      <main className="storefront-page">
        <div className="empty-state">
          {error || t("Store not found")}
          <Link className="primary-button store-back-button" to="/">{t("Back to shopping")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="storefront-page">
      <section
        className="storefront-banner"
        style={store.bannerUrl ? { backgroundImage: `linear-gradient(90deg, #102a20c9, #102a2040), url("${store.bannerUrl}")` } : undefined}
      >
        {store.logoUrl
          ? <img className="storefront-logo" src={store.logoUrl} alt="" />
          : <span className="storefront-logo storefront-logo-fallback" aria-hidden="true">{store.name.charAt(0).toUpperCase()}</span>}
        <div className="storefront-heading">
          <span className="storefront-kicker">{t("Independent Green Market store")}</span>
          <h1>{store.name}</h1>
          <p>{store.description}</p>
          <div className="storefront-contact">
            {store.category && <span>{t(store.category)}</span>}
            {store.address && <span>{store.address}</span>}
            {store.phone && <a href={`tel:${store.phone}`}>{store.phone}</a>}
            {store.contactEmail && <a href={`mailto:${store.contactEmail}`}>{store.contactEmail}</a>}
          </div>
        </div>
      </section>

      <section className="storefront-products">
        <div className="storefront-products-heading">
          <div>
            <span className="eyebrow muted-eyebrow">{t("SHOP THIS STORE")}</span>
            <h2>{t("Products from {store}", { store: store.name })}</h2>
          </div>
          <Link className="storefront-main-link" to="/">{t("Visit Green Market")}</Link>
        </div>
        {products.length ? (
          <div className="product-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                product={{ ...product, store: { name: store.name, slug: store.slug } }}
                index={index}
                isFavorite={favorites.includes(product._id)}
                onToggleFavorite={toggleFavorite}
                onAddToCart={onAddToCart}
                onNotice={onNotice}
                autoOpenDetails={product._id === sharedProductId || product.slug === sharedProductId}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">{t("This store has not added products yet.")}</div>
        )}
      </section>
    </main>
  );
}

export default StorefrontPage;
