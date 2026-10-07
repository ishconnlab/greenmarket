import { useLanguage } from "../context/LanguageContext.jsx";

function AuthDialog({ mode, busy, onClose, onModeChange, onSubmit }) {
  const isLogin = mode === "login";
  const { t } = useLanguage();

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="close-button" onClick={onClose} aria-label={t("Close")}>×</button>
        <span className="eyebrow muted-eyebrow">{t(isLogin ? "WELCOME BACK" : "JOIN THE GOOD THINGS")}</span>
        <h2 id="auth-title">{t(isLogin ? "Sign in" : "Create your account")}</h2>
        <form onSubmit={onSubmit} className="form-stack">
          {!isLogin && <label>{t("Your name")}<input name="name" required autoComplete="name" /></label>}
          <label>{t("Email address")}<input name="email" type="email" required autoComplete="email" /></label>
          <label>
            {t("Password")}
            <input
              name="password"
              type="password"
              required
              minLength="6"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? t("Please wait...") : t(isLogin ? "Sign in" : "Create account")}
          </button>
        </form>
        <p className="switch-auth">
          {t(isLogin ? "New around here?" : "Already have an account?")}
          <button onClick={() => onModeChange(isLogin ? "register" : "login")}>
            {t(isLogin ? "Create an account" : "Sign in")}
          </button>
        </p>
      </section>
    </div>
  );
}

export default AuthDialog;
