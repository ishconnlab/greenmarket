import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-about">
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">g</span>
            <span>green<span className="brand-light">market</span></span>
          </Link>
          <p>Good fruit, useful things, and a few small upgrades for everyday life.</p>
        </div>
        <div className="footer-column">
          <h2>Explore</h2>
          <Link to="/#shop">Shop everything</Link>
          <Link to="/orders">Your orders</Link>
        </div>
        <div className="footer-column">
          <h2>In the shop</h2>
          <span>Fruit &amp; food</span>
          <span>Home &amp; care</span>
          <span>Everyday devices</span>
        </div>
        <p className="footer-signoff">A good find can make an ordinary day.</p>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Green Market</span>
        <span>Thoughtfully picked. Ready for real life.</span>
      </div>
    </footer>
  );
}

export default Footer;
