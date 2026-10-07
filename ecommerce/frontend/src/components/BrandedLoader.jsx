import { useLanguage } from "../context/LanguageContext.jsx";

function BrandedLoader({ label }) {
  const { t } = useLanguage();
  return (
    <div className="branded-loader" role="status" aria-live="polite">
      <span className="branded-loader-mark" aria-hidden="true">g</span>
      <span className="branded-loader-spinner" aria-hidden="true" />
      <strong>{label}</strong>
      <small>{t("Powered by Ishconnect")}</small>
    </div>
  );
}

export default BrandedLoader;
