import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-about">
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">g</span>
            <span>green<span className="brand-light">market</span></span>
          </Link>
          <p>{t("Good fruit, useful things, and a few small upgrades for everyday life.")}</p>
        </div>
        <div className="footer-column">
          <h2>{t("Explore")}</h2>
          <Link to="/#shop">{t("Shop everything")}</Link>
          <Link to="/orders">{t("Your orders")}</Link>
          <Link to="/profile">{t("Your profile & support")}</Link>
          <Link to="/help">{t("Help centre")}</Link>
          <Link to="/seller">{t("Sell with us")}</Link>
        </div>
        <div className="footer-column">
          <h2>{t("Visit & contact")}</h2>
          <span>Kabuga Market</span>
          <a href="tel:+250787377750">0787 377 750</a>
          <a href="mailto:info@greenmarket.rw">info@greenmarket.rw</a>
          <a href="mailto:ishconnlab@gmail.com">{t("Contact the developer")}</a>
        </div>
        <div className="footer-column">
          <h2>{t("Information")}</h2>
          <Link to="/guide">{t("Shopping guide")}</Link>
          <Link to="/policies">{t("Store policies")}</Link>
          <Link to="/privacy">{t("Privacy")}</Link>
          <Link to="/profile#contact">{t("Contact us")}</Link>
        </div>
        <p className="footer-signoff">{t("A good find can make an ordinary day.")}</p>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Green Market</span>
        <span>{t("Thoughtfully picked. Ready for real life.")}</span>
      </div>
    </footer>
  );
}

export default Footer;
