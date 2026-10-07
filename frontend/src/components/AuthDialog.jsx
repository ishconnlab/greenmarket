function AuthDialog({ mode, busy, onClose, onModeChange, onSubmit }) {
  const isLogin = mode === "login";

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow muted-eyebrow">{isLogin ? "WELCOME BACK" : "JOIN THE GOOD THINGS"}</span>
        <h2 id="auth-title">{isLogin ? "Sign in" : "Create your account"}</h2>
        <form onSubmit={onSubmit} className="form-stack">
          {!isLogin && <label>Your name<input name="name" required autoComplete="name" /></label>}
          <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength="6"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="switch-auth">
          {isLogin ? "New around here?" : "Already have an account?"}
          <button onClick={() => onModeChange(isLogin ? "register" : "login")}>
            {isLogin ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </div>
  );
}

export default AuthDialog;
