import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <main className="not-found-page">
      <img src="/error.svg" alt={t("404 illustration")} />
      <div className="not-found-copy">
        <span className="eyebrow muted-eyebrow">404</span>
        <h1>{t("Page not found")}</h1>
        <p>{t("This page may have moved, or the address may be incorrect.")}</p>
        <Link className="primary-button" to="/">{t("Back to shopping")}</Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
