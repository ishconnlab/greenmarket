import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { money } from "../utils/format.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function ProductCard({ product, index, isFavorite, onToggleFavorite, onAddToCart, autoOpenDetails = false }) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const inStock = product.stock > 0;
  const storePath = product.store?.slug ? `/store/${product.store.slug}` : "";
  const needsStoreVisit = Boolean(storePath) && pathname !== storePath;
  const [detailsOpen, setDetailsOpen] = useState(autoOpenDetails);
  const [shareNotice, setShareNotice] = useState("");

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailsOpen]);
  useEffect(() => {
    if (autoOpenDetails) setDetailsOpen(true);
  }, [autoOpenDetails]);

  const storefrontOrigin = import.meta.env.VITE_STOREFRONT_URL || "https://greenmarket-livid.vercel.app";
  const shareUrl = new URL(`/share/products/${product._id}`, storefrontOrigin).href;
  const shareText = [
    product.name,
    product.category,
    product.description,
    `${t("Price")}: ${money(product.price)}`,
    shareUrl,
  ].filter(Boolean).join("\n");
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  async function shareToInstagram() {
    setShareNotice("");
    if (typeof navigator.share === "function") {
      try {
        if (product.imageUrl && typeof navigator.canShare === "function") {
          try {
            const response = await fetch(product.imageUrl);
            if (response.ok) {
              const image = await response.blob();
              if (image.size <= 8 * 1024 * 1024) {
                const file = new File([image], `${product.slug || "green-market-product"}.jpg`, {
                  type: image.type || "image/jpeg",
                });
                const files = [file];
                if (navigator.canShare({ files })) {
                  await navigator.share({ title: product.name, text: shareText, files });
                  return;
                }
              }
            }
          } catch (imageError) {
            if (imageError.name === "AbortError") return;
          }
        }
        await navigator.share({ title: product.name, text: shareText, url: shareUrl });
        return;
      } catch (shareError) {
        if (shareError.name === "AbortError") return;
        console.error("Could not open the native share sheet:", shareError);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShareNotice(t("Product link copied. Paste it into Instagram to share."));
    } catch (clipboardError) {
      console.error("Could not copy product share link:", clipboardError);
      setShareNotice(t("Copy the product link to share it on Instagram."));
    }
  }

  return (
    <article className="product-card" style={{ "--card-index": index }}>
      <div className={`product-image-wrap product-art-${index % 4}`}>
        {product.imageUrl && (
          <img
            className="product-image"
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        <span className="product-category">{t(product.category || "Everyday")}</span>
        {product.promotionLabel && (
          <span className={`product-promotion product-promotion-${product.promotionColor || "green"}`}>
            {product.promotionLabel}
          </span>
        )}
        <button
          className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
          onClick={() => onToggleFavorite(product._id)}
          aria-label={t(isFavorite ? "Remove {name} from favorites" : "Add {name} to favorites", { name: product.name })}
          aria-pressed={isFavorite}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
          </svg>
        </button>
        <span className={`product-stock ${inStock ? "" : "out-of-stock"}`}>
          <span />{t(inStock ? "In stock" : "Sold out")}
        </span>
        {needsStoreVisit ? (
          <Link className="quick-add quick-add-link" to={storePath}>
            {t("Visit store")} <span aria-hidden="true">↗</span>
          </Link>
        ) : (
          <button className="quick-add" onClick={() => onAddToCart(product)} disabled={!inStock}>
            {t(inStock ? "Add to bag" : "Sold out")} <span aria-hidden="true">+</span>
          </button>
        )}
      </div>
      <div className="product-info">
        <div>
          <h3>{product.name}</h3>
          {product.store?.slug && (
            <Link className="product-store-attribution" to={`/store/${product.store.slug}`}>
              {t("From {store}", { store: product.store.name })}
            </Link>
          )}
          <p>{product.description || t("Product details coming soon.")}</p>
        </div>
        <button className="product-details-button" onClick={() => setDetailsOpen(true)}>
          {t("View product details")} <span aria-hidden="true">↗</span>
        </button>
        <div className="product-buy">
          <strong>{money(product.price)}</strong>
          {needsStoreVisit ? (
            <Link className="add-button add-button-link" to={storePath}>{t("Visit store")} ↗</Link>
          ) : (
            <button className="add-button" onClick={() => onAddToCart(product)} disabled={!inStock}>
              {t(inStock ? "Add to bag +" : "Sold out")}
            </button>
          )}
        </div>
      </div>
      {detailsOpen && (
        <div
          className="modal-backdrop product-detail-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setDetailsOpen(false)}
        >
          <section
            className="dialog product-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`product-title-${product._id}`}
          >
            <button
              className="close-button"
              onClick={() => setDetailsOpen(false)}
              aria-label={t("Close")}
            >
              ×
            </button>
            {product.imageUrl && (
              <img
                className="product-detail-image"
                src={product.imageUrl}
                alt={product.imageAlt || product.name}
              />
            )}
            <span className="product-detail-category">{t(product.category || "Everyday")}</span>
            <h2 id={`product-title-${product._id}`}>{product.name}</h2>
            {product.store?.slug && (
              <Link className="product-store-attribution product-detail-store" to={`/store/${product.store.slug}`}>
                {t("Visit {store}", { store: product.store.name })}
              </Link>
            )}
            <p className="product-detail-description">
              {product.description || t("Product details coming soon.")}
            </p>
            <div className="product-detail-facts">
              <div><span>{t("Price")}</span><strong>{money(product.price)}</strong></div>
              <div>
                <span>{t("Availability")}</span>
                <strong className={inStock ? "product-detail-available" : "product-detail-unavailable"}>
                  {t(inStock ? "In stock" : "Sold out")}
                </strong>
              </div>
            </div>
            <div className="product-share">
              <span className="product-share-label">{t("Share this product")}</span>
              <div className="product-share-actions">
                <a className="product-share-button whatsapp-share" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true">↗</span> WhatsApp
                </a>
                <a className="product-share-button facebook-share" href={facebookUrl} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true">f</span> Facebook
                </a>
                <button className="product-share-button instagram-share" onClick={shareToInstagram}>
                  <span aria-hidden="true">◎</span> Instagram
                </button>
              </div>
              {shareNotice && <p className="product-share-notice" role="status">{shareNotice}</p>}
            </div>
            {needsStoreVisit ? (
              <Link className="primary-button product-detail-add product-detail-store-link" to={storePath} onClick={() => setDetailsOpen(false)}>
                {t("Visit store")}
              </Link>
            ) : (
              <button
                className="primary-button product-detail-add"
                onClick={() => {
                  onAddToCart(product);
                  setDetailsOpen(false);
                }}
                disabled={!inStock}
              >
                {t(inStock ? "Add to bag" : "Sold out")}
              </button>
            )}
          </section>
        </div>
      )}
    </article>
  );
}

export default ProductCard;
