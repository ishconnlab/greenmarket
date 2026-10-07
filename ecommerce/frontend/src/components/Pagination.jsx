import { useLanguage } from "../context/LanguageContext.jsx";

function Pagination({ page, totalPages, total, onPageChange }) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;

  return (
    <nav className="data-pagination" aria-label={t("Pagination")}>
      <span>{t("Page {page} of {pages}", { page, pages: totalPages })} · {t("{count} total", { count: total })}</span>
      <div>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {t("Previous")}
        </button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          {t("Next")}
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
