import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

function ShopPage({ products, loading, error, onRetry, onAddToCart }) {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const sharedProductId = searchParams.get("product");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("green-market-favorites")) || [];
    } catch {
      return [];
    }
  });
  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query);
      const matchesFavorites = !favoritesOnly || favorites.includes(product._id);
      return matchesCategory && matchesSearch && matchesFavorites;
    });
    if (sort === "price-low") result.sort((a, b) => a.price - b.price);
    if (sort === "price-high") result.sort((a, b) => b.price - a.price);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, search, category, favoritesOnly, favorites, sort]);

  function toggleFavorite(productId) {
    setFavorites((current) => {
      const updated = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      localStorage.setItem("green-market-favorites", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <main>
      <Hero />
      <section className="category-ribbon" aria-label={t("Shop by category")}>
        <div className="category-ribbon-heading">
          <span className="eyebrow muted-eyebrow">{t("A GOOD PLACE TO START")}</span>
          <span>{t("Small joys, sorted.")}</span>
        </div>
        <div className="category-shortcuts">
          {categories.filter((item) => item !== "All").map((item, index) => (
            <button
              key={item}
              className={`category-shortcut shortcut-${index % 5} ${category === item ? "selected" : ""}`}
              onClick={() => {
                setCategory(category === item ? "All" : item);
                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="shortcut-icon">{item === "Fruit" ? "✳" : item === "Food" ? "◒" : item === "Devices" ? "⌁" : item === "Home" ? "⌂" : "✦"}</span>
              <span>{t(item)}</span>
              <span className="shortcut-arrow" aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </section>
      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div>
            <span className="eyebrow muted-eyebrow">{t("THE EDIT")}</span>
            <h2>{t("Find your new favorite")}<span className="title-period">.</span></h2>
            <p className="section-subtitle">{t("Little things that make a day feel a little better.")}</p>
          </div>
          <label className="search-box">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search products")}
              aria-label={t("Search products")}
            />
          </label>
        </div>

        <div className="catalog-toolbar">
          <div className="category-list" aria-label={t("Filter products by category")}>
            {categories.map((item) => (
              <button
                key={item}
                className={`category-chip ${category === item ? "active" : ""}`}
                onClick={() => setCategory(item)}
              >
                {t(item)}
              </button>
            ))}
          </div>
          <div className="catalog-tools">
            <button
              className={`favorites-filter ${favoritesOnly ? "active" : ""}`}
              onClick={() => setFavoritesOnly((current) => !current)}
              aria-pressed={favoritesOnly}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" /></svg>
              {t("Saved")} <span>{favorites.length}</span>
            </button>
            <label className="sort-control">
              <span>{t("Sort:")}</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t("Sort products")}>
                <option value="featured">{t("Featured")}</option>
                <option value="price-low">{t("Price: low to high")}</option>
                <option value="price-high">{t("Price: high to low")}</option>
                <option value="name">{t("Name")}</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">{t("Finding the good stuff...")}</div>
        ) : error ? (
          <div className="empty-state">
            {error}
            <button className="retry-button" onClick={onRetry}>{t("Try again")}</button>
          </div>
        ) : filteredProducts.length ? (
          <>
            <div className="results-label">
              <span>{favoritesOnly ? t("Your saved finds") : category === "All" ? t("A few good things") : t(category)}</span>
              <span>{filteredProducts.length} {filteredProducts.length === 1 ? t("find") : t("finds")}</span>
            </div>
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  index={index}
                  isFavorite={favorites.includes(product._id)}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={onAddToCart}
                  autoOpenDetails={
                    Boolean(sharedProductId)
                    && (product._id === sharedProductId || product.slug === sharedProductId)
                  }
                />
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            {favoritesOnly ? t("No saved finds yet. Tap a heart to keep something close.") : t("No products found. Try another search.")}
            {favoritesOnly && <button className="retry-button" onClick={() => setFavoritesOnly(false)}>{t("Browse everything")}</button>}
          </div>
        )}
      </section>

      <section className="promise-row">
        <div><span className="promise-icon">✳</span><strong>{t("Chosen with care")}</strong><p>{t("Everyday favourites, thoughtfully gathered.")}</p></div>
        <div><span className="promise-icon">↗</span><strong>{t("Room for discovery")}</strong><p>{t("Fresh produce, home finds and useful tech.")}</p></div>
        <div><span className="promise-icon">♡</span><strong>{t("Keep what you love")}</strong><p>{t("Save your favourite finds for next time.")}</p></div>
      </section>
    </main>
  );
}

export default ShopPage;
