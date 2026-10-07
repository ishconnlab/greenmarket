import { Link, NavLink } from "react-router-dom";

function Header({ user, isAdmin, cartCount, onOpenCart, onSignIn, onSignOut }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="Green Market home">
        <span className="brand-mark">g</span>
        <span>green<span className="brand-light">market</span></span>
      </Link>
      <nav className="header-actions" aria-label="Main navigation">
        <NavLink className="text-button nav-link" to="/" end>Shop</NavLink>
        {user && <NavLink className="text-button nav-link" to="/orders">Orders</NavLink>}
        {isAdmin && <NavLink className="text-button nav-link" to="/admin">Admin</NavLink>}
        {user ? (
          <button className="text-button signout-button" onClick={onSignOut}>Sign out</button>
        ) : (
          <button className="text-button" onClick={onSignIn}>Sign in</button>
        )}
        <button
          className="cart-button"
          onClick={onOpenCart}
          aria-label={`Open cart, ${cartCount} items`}
        >
          <span aria-hidden="true">Bag</span>
          <span className="cart-count">{cartCount}</span>
        </button>
      </nav>
    </header>
  );
}

export default Header;
