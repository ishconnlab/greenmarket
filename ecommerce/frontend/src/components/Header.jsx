import { useEffect, useRef, useState } from "react";
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

function getStoreThemeColor(slug) {
  const colors = ["#176b45", "#295d79", "#8f5537", "#70528a", "#9a6734"];
  const hash = [...slug].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  return colors[hash % colors.length];
}

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

function Header({ user, isAdmin, isSeller, store, cartCount, onOpenCart, onSignIn, onSignOut }) {
  const { language, setLanguage, t } = useLanguage();
  const { pathname, search } = useLocation();
  const storeSlug = pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
  const showingStore = Boolean(store && store.slug === storeSlug);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installStatus, setInstallStatus] = useState("");
  const installScope = useRef("");
  const [isInstalled, setIsInstalled] = useState(false);
  const [promotions, setPromotions] = useState(initialMarketStories);
  const [promotionRequestFailed, setPromotionRequestFailed] = useState(false);

  useEffect(() => {
    const captureInstallPrompt = (event) => {
      event.preventDefault();
      installScope.current = window.location.pathname.match(/^\/store\/([^/]+)/)?.[1] || "";
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
    const manifest = document.querySelector('link[rel="manifest"]');
    const icon = document.querySelector('link[rel="icon"]');
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!manifest || !icon || !appleIcon || !themeColor) return undefined;

    const original = {
      manifest: manifest.getAttribute("href"),
      icon: icon.getAttribute("href"),
      appleIcon: appleIcon.getAttribute("href"),
      themeColor: themeColor.content,
      appleTitle: appleTitle?.content,
    };
    if (showingStore) {
      const storeBase = `/store/${encodeURIComponent(store.slug)}`;
      const storeIcon = `${storeBase}/app-icon.svg`;
      manifest.href = `${storeBase}/manifest.webmanifest`;
      icon.href = storeIcon;
      appleIcon.href = "/icons/icon-180.png";
      themeColor.content = getStoreThemeColor(store.slug);
      if (appleTitle) appleTitle.content = store.name.slice(0, 16);
    }
    const launchedAsStoreApp = showingStore && new URLSearchParams(search).get("source") === "store-pwa";
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    setIsInstalled(Boolean(launchedAsStoreApp || (standalone && !showingStore)));
    if (installPrompt && (installScope.current || "") !== (showingStore ? store.slug : "")) {
      setInstallPrompt(null);
    }
    return () => {
      manifest.href = original.manifest || "/manifest.webmanifest";
      icon.href = original.icon || "/favicon.svg";
      appleIcon.href = original.appleIcon || "/icons/icon-180.png";
      themeColor.content = original.themeColor || "#176b45";
      if (appleTitle && original.appleTitle) appleTitle.content = original.appleTitle;
    };
  }, [installPrompt, search, showingStore, store?.slug]);

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
    const correctInstallPrompt = installPrompt
      && (installScope.current || "") === (showingStore ? store.slug : "");
    if (!correctInstallPrompt) {
      setInstallStatus(showingStore
        ? t("Use your browser menu to install the {store} app.", { store: store.name })
        : t("Use your browser menu to install Green Market."));
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted" && showingStore) {
        installScope.current = store.slug;
      }
    } catch (error) {
      console.error("Could not start Green Market installation:", error);
      setInstallStatus(t("Could not start installation. Use your browser menu to install the app."));
      setInstallPrompt(null);
    }
  }

  return (
    <header className="site-header">
      <div className={`topbar${user ? " topbar-authenticated" : ""}${(showingStore || installPrompt) && !isInstalled ? " topbar-installable" : ""}`}>
        <Link className="brand" to={showingStore ? `/store/${store.slug}` : "/"} aria-label={showingStore ? store.name : "Green Market home"}>
          {showingStore && store.logoUrl
            ? <img className="header-store-logo" src={store.logoUrl} alt="" />
            : <span className="brand-mark">{showingStore ? store.name.trim().charAt(0).toUpperCase() : "g"}</span>}
          <span>{showingStore ? store.name : <>green<span className="brand-light">market</span></>}</span>
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
          {(showingStore || installPrompt) && !isInstalled && (
            <button className="install-app-button" onClick={installApp}>
              <span aria-hidden="true">↓</span> {t(showingStore ? "Install {store}" : "Install app", { store: store?.name })}
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
      {promotions.length > 0 && (
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
      {promotionRequestFailed && (
        <p className="sr-only" role="status">{t("Promotions could not be loaded.")}</p>
      )}
    </header>
  );
}

export default Header;
