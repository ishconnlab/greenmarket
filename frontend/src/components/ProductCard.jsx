import { money } from "../utils/format.js";

function ProductCard({ product, index, isFavorite, onToggleFavorite, onAddToCart }) {
  const inStock = product.stock > 0;

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
        <span className="product-category">{product.category || "Everyday"}</span>
        <button
          className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
          onClick={() => onToggleFavorite(product._id)}
          aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={isFavorite}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
          </svg>
        </button>
        <span className={`product-stock ${inStock ? "" : "out-of-stock"}`}>
          <span />{inStock ? "In stock" : "Sold out"}
        </span>
        <button
          className="quick-add"
          onClick={() => onAddToCart(product)}
          disabled={!inStock}
        >
          {inStock ? "Add to bag" : "Sold out"} <span aria-hidden="true">+</span>
        </button>
      </div>
      <div className="product-info">
        <div>
          <h3>{product.name}</h3>
          <p>{product.description || "A thoughtful pick for your everyday."}</p>
        </div>
        <div className="product-buy">
          <strong>{money(product.price)}</strong>
          <button
            className="add-button"
            onClick={() => onAddToCart(product)}
            disabled={!inStock}
          >
            {inStock ? "Add to bag +" : "Sold out"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
