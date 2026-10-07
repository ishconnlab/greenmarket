import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { apiErrorMessage } from "../utils/apiError.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import BrandedLoader from "../components/BrandedLoader.jsx";

const messageTypes = [
  ["message", "General message"],
  ["wish", "Product wish or suggestion"],
  ["report", "Report an issue"],
  ["help", "Help request"],
];

function ProfilePage({ user, onSignIn, onSignOut }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setMessages([]);
      return undefined;
    }

    let active = true;
    async function loadMessages() {
      try {
        const { data } = await api.get("/contact/messages");
        if (active) {
          setMessages(data.messages);
          setError("");
        }
      } catch (requestError) {
        if (active && !document.hidden) {
          setError(apiErrorMessage(requestError, "Could not load your support messages."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadMessages();
    }, 20000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  async function submitMessage(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await api.post("/contact/messages", {
        type: data.get("type"),
        message: data.get("message"),
      });
      setMessages((current) => [response.data.message, ...current]);
      setNotice(t("Thanks for getting in touch. Your message is in your account inbox."));
      form.reset();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Could not send your message."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="profile-page">
      <Link className="back-link" to="/">← {t("Back to shopping")}</Link>
      <span className="eyebrow muted-eyebrow">{t("YOUR GREEN MARKET")}</span>
      <h1>{t("Your profile")}</h1>
      {!user ? (
        <section className="profile-card profile-signin">
          <h2>{t("Sign in to your account")}</h2>
          <p>{t("Your profile, order history, and support messages are available after you sign in.")}</p>
          <button className="primary-button" onClick={onSignIn}>{t("Sign in")}</button>
        </section>
      ) : (
        <>
          <section className="profile-card profile-details">
            <div className="profile-avatar" aria-hidden="true">
              {user.name?.trim()?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div className="profile-identity">
              <span className="eyebrow muted-eyebrow">{t("ACCOUNT DETAILS")}</span>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="profile-role">{t(user.role === "admin" ? "Store administrator" : "Green Market customer")}</span>
            </div>
            <button className="retry-button profile-signout" onClick={onSignOut}>{t("Sign out")}</button>
          </section>

          <nav className="profile-shortcuts" aria-label={t("Account shortcuts")}>
            <Link to="/orders"><strong>{t("Order history")}</strong><span>{t("Track fulfilment and payment confirmation")}</span></Link>
            <a href="#contact"><strong>{t("Contact support")}</strong><span>{t("Send a message, wish, or issue report")}</span></a>
            <a href="#messages"><strong>{t("Support replies")}</strong><span>{t("Read responses from the Green Market team")}</span></a>
          </nav>

          <section className="profile-card profile-contact" id="contact">
            <span className="eyebrow muted-eyebrow">{t("WE’RE HERE TO HELP")}</span>
            <h2>{t("Send us a message")}</h2>
            <p>{t("Your name and email are taken from your signed-in account so our team can identify and reply to you.")}</p>
            {error && <div className="profile-error" role="alert">{error}</div>}
            {notice && <div className="profile-success" role="status">{notice}</div>}
            <form className="profile-contact-form" onSubmit={submitMessage}>
              <div className="profile-contact-identity">
                <span>                <small>{t("Name")}</small><strong>{user.name}</strong></span>
                <span>                <small>{t("Email address")}</small><strong>{user.email}</strong></span>
              </div>
              <label>
                {t("What can we help with?")}
                <select name="type" defaultValue="message">
                  {messageTypes.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
              </label>
              <label>
                {t("Your message")}
                <textarea
                  name="message"
                  rows="5"
                  maxLength={3000}
                  required
                  placeholder={t("Tell us how we can help, what you’d like to see, or what needs attention...")}
                />
              </label>
              <button className="primary-button" disabled={busy}>
                {busy ? t("Sending...") : t("Send to Green Market")}
              </button>
            </form>
          </section>

          <section className="profile-card profile-messages" id="messages">
            <div className="profile-section-heading">
              <div>
                <span className="eyebrow muted-eyebrow">{t("YOUR INBOX")}</span>
                <h2>{t("Messages and replies")}</h2>
              </div>
              <span>{messages.length} {t("messages")}</span>
            </div>
            {loading ? (
              <BrandedLoader label={t("Loading your messages...")} />
            ) : error && !messages.length ? (
              <p className="profile-error" role="alert">{error}</p>
            ) : !messages.length ? (
              <p className="profile-empty">{t("Your support conversations will appear here.")}</p>
            ) : (
              <div className="profile-message-list">
                {messages.map((message) => (
                  <article className="profile-message" key={message._id}>
                    <div className="profile-message-heading">
                      <strong>{t(messageTypes.find(([value]) => value === message.type)?.[1] || "Message")}</strong>
                      <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                    </div>
                    <p>{message.message}</p>
                    {message.reply ? (
                      <div className="profile-reply">
                        <strong>{t("Green Market team replied")}</strong>
                        {message.repliedAt && <time dateTime={message.repliedAt}>{new Date(message.repliedAt).toLocaleString()}</time>}
                        <p>{message.reply}</p>
                      </div>
                    ) : (
                      <span className="profile-pending">{t("Waiting for a reply")}</span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      <section className="profile-card profile-market-info" id="market-info">
        <span className="eyebrow muted-eyebrow">{t("GREEN MARKET DETAILS")}</span>
        <h2>{t("Help, policies & contact")}</h2>
        <div className="profile-market-info-grid">
          <div>
            <h3>{t("Visit & contact")}</h3>
            <span>Kabuga Market</span>
            <a href="tel:+250787377750">0787 377 750</a>
            <a href="mailto:info@greenmarket.rw">info@greenmarket.rw</a>
            <a href="mailto:ishconnlab@gmail.com">{t("Contact the developer")}</a>
          </div>
          <div>
            <h3>{t("Explore")}</h3>
            <Link to="/#shop">{t("Shop everything")}</Link>
            <Link to="/orders">{t("Your orders")}</Link>
            <Link to="/seller">{t("Sell with us")}</Link>
          </div>
          <div>
            <h3>{t("Information")}</h3>
            <Link to="/help">{t("Help centre")}</Link>
            <Link to="/guide">{t("Shopping guide")}</Link>
            <Link to="/policies">{t("Store policies")}</Link>
            <Link to="/privacy">{t("Privacy")}</Link>
          </div>
        </div>
        <div className="profile-market-info-bottom">
          <span>© {new Date().getFullYear()} Green Market · {t("Thoughtfully picked. Ready for real life.")}</span>
          <span>{t("Powered by")} <a href="mailto:ishconnlab@gmail.com">Ishconnect</a></span>
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;
