import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import api from "../api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const initialMarketStories = [
  {
    imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=240&q=80",
    imageAlt: "Fresh colorful produce",
    eyebrow: "TRENDING AT THE MARKET",
    title: "Fresh picks for your week",
    detail: "See what just arrived",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=240&q=80",
    imageAlt: "Vegetables ready for the kitchen",
    eyebrow: "GOOD THINGS, GROWING",
    title: "Make everyday meals brighter",
    detail: "Browse market favourites",
  },
  {
    imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=240&q=80",
    imageAlt: "Warm, comfortable home",
    eyebrow: "A LITTLE HOME REFRESH",
    title: "Thoughtful finds for home",
    detail: "Explore the collection",
  },
];

function getYouTubeThumbnail(mediaUrl) {
  if (!mediaUrl) return "";
  try {
    const url = new URL(mediaUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be"
      ? segments[0]
      : url.searchParams.get("v") || (["shorts", "embed", "live"].includes(segments[0]) ? segments[1] : "");
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://img.youtube.com/vi/${id}/mqdefault.jpg`
      : "";
  } catch {
    return "";
  }
}

function Header({ user, isAdmin, isSeller, cartCount, onOpenCart, onSignIn, onSignOut }) {
  const { language, setLanguage, t } = useLanguage();
  const { pathname } = useLocation();
  const showMarketTicker = pathname !== "/admin";
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installStatus, setInstallStatus] = useState("");
  const [isInstalled, setIsInstalled] = useState(() => (
    typeof window !== "undefined"
    && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true)
  ));
  const [promotions, setPromotions] = useState(initialMarketStories);
  const [promotionRequestFailed, setPromotionRequestFailed] = useState(false);

  useEffect(() => {
    const captureInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const markInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
      setInstallStatus(t("Green Market is installed."));
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    const loadPromotions = () => api.get("/promotions")
      .then(({ data }) => {
        if (!Array.isArray(data.promotions)) throw new Error("Promotions response is invalid");
        if (active) {
          setPromotions(data.promotions);
          setPromotionRequestFailed(false);
        }
      })
      .catch((error) => {
        console.error("Could not load current promotions:", error);
        if (active) {
          setPromotions([]);
          setPromotionRequestFailed(true);
        }
      });
    const refreshPromotions = () => { void loadPromotions(); };
    void loadPromotions();
    window.addEventListener("green-market-promotions-changed", refreshPromotions);
    return () => {
      active = false;
      window.removeEventListener("green-market-promotions-changed", refreshPromotions);
    };
  }, []);

  const renderStories = (copy = false) => promotions.map((story) => {
    const thumbnail = story.imageUrl || getYouTubeThumbnail(story.mediaUrl);
    const storyContent = (
      <>
        {thumbnail
          ? <img src={thumbnail} alt={copy ? "" : story.imageAlt || story.title} loading="lazy" />
          : <span className="market-story-placeholder" aria-hidden="true">g</span>}
        <span className="market-story-copy">
          <span className="market-story-eyebrow">{t(story.eyebrow)}</span>
          <strong>{t(story.title)}</strong>
          <span className="market-story-detail">
            {t(story.detail)} <span aria-hidden="true">{story.mediaUrl ? "▶" : "↗"}</span>
          </span>
        </span>
      </>
    );
    const key = `${copy ? "repeat-" : ""}${story._id || story.title}`;
    return story.mediaUrl ? (
      <a
        className={`market-story${story.mediaUrl ? " market-story-video" : ""}`}
        href={story.mediaUrl}
        key={key}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={copy ? -1 : undefined}
        aria-hidden={copy ? "true" : undefined}
        aria-label={`${t(story.title)} — ${t("Watch video")}`}
      >
        {storyContent}
      </a>
    ) : (
      <Link
        className="market-story"
        to="/#shop"
        key={key}
        tabIndex={copy ? -1 : undefined}
        aria-hidden={copy ? "true" : undefined}
      >
        {storyContent}
      </Link>
    );
  });

  async function installApp() {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch (error) {
      console.error("Could not start Green Market installation:", error);
      setInstallStatus(t("Could not start installation. Use your browser menu to install the app."));
      setInstallPrompt(null);
    }
  }

  return (
    <header className="site-header">
      <div className={`topbar${user ? " topbar-authenticated" : ""}${installPrompt && !isInstalled ? " topbar-installable" : ""}`}>
        <Link className="brand" to="/" aria-label="Green Market home">
          <span className="brand-mark">g</span>
          <span>green<span className="brand-light">market</span></span>
        </Link>
        <nav className="header-actions" aria-label="Main navigation">
          <NavLink className="text-button nav-link" to="/" end>{t("Shop")}</NavLink>
          {user && <NavLink className="text-button nav-link" to="/orders">{t("Orders")}</NavLink>}
          {user && <NavLink className="text-button nav-link" to="/profile">{t("Profile")}</NavLink>}
          {isSeller
            ? <NavLink className="text-button nav-link seller-nav-link" to="/seller">{t("My store")}</NavLink>
            : <NavLink className="text-button nav-link seller-nav-link" to="/seller">{t("Sell with us")}</NavLink>}
          {isAdmin && <NavLink className="text-button nav-link" to="/admin">{t("Admin")}</NavLink>}
          <label className="language-picker">
            <span className="sr-only">{t("Choose language")}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label={t("Choose language")}
            >
              <option value="en">English</option>
              <option value="rw">Kinyarwanda</option>
            </select>
          </label>
          {user ? (
            <button className="text-button signout-button" onClick={onSignOut}>{t("Sign out")}</button>
          ) : (
            <button className="text-button" onClick={onSignIn}>{t("Sign in")}</button>
          )}
          {installPrompt && !isInstalled && (
            <button className="install-app-button" onClick={installApp}>
              <span aria-hidden="true">↓</span> {t("Install app")}
            </button>
          )}
          <button
            className="cart-button"
            onClick={onOpenCart}
            aria-label={t("Open cart, {count} items", { count: cartCount })}
          >
            <span aria-hidden="true">{t("Your bag")}</span>
            <span className="cart-count">{cartCount}</span>
          </button>
        </nav>
      </div>
      {installStatus && <p className="install-status" role="status">{installStatus}</p>}
      {showMarketTicker && promotions.length > 0 && (
        <section className="market-ticker" aria-label={t("Green Market promotions")}>
          <div className="market-ticker-label">
            <span className="market-live-dot" aria-hidden="true" />
            <span>{t("MARKET WATCH")}</span>
            <span className="market-ticker-now">{t("NOW")}</span>
          </div>
          <div className="market-ticker-window">
            <div className="market-ticker-track">
              <div className="market-ticker-set">{renderStories()}</div>
              <div className="market-ticker-set" aria-hidden="true">{renderStories(true)}</div>
            </div>
          </div>
        </section>
      )}
      {showMarketTicker && promotionRequestFailed && (
        <p className="sr-only" role="status">{t("Promotions could not be loaded.")}</p>
      )}
    </header>
  );
}

export default Header;
