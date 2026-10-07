import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1800&q=88",
    caption: "Fresh market produce",
    alt: "Fresh produce arranged at a market",
  },
  {
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=88",
    caption: "Good things for your home",
    alt: "Fresh vegetables and groceries",
  },
  {
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1800&q=88",
    caption: "Everyday essentials",
    alt: "A warm, welcoming home interior",
  },
];

function Hero() {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="hero">
      {heroSlides.map((slide, index) => (
        <div
          key={slide.image}
          className={`hero-image${index === activeSlide ? " active" : ""}`}
          style={{ backgroundImage: `url("${slide.image}")` }}
          role={index === activeSlide ? "img" : undefined}
          aria-label={index === activeSlide ? slide.alt : undefined}
          aria-hidden={index !== activeSlide}
        />
      ))}
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> {t("A BRIGHTER KIND OF EVERYDAY")}</span>
        <h1>{t("The everyday,")}<br /><em>{t("well chosen.")}</em></h1>
        <p>{t("Fruit for the week, pantry staples, and useful things for home and on the go. Good finds, all in one place.")}</p>
        <div className="hero-actions">
          <a className="hero-link" href="#shop">{t("Explore the collection")} <span aria-hidden="true">↗</span></a>
          <span className="hero-note">{t("A little more lovely, every day.")}</span>
        </div>
      </div>
      <div className="hero-stamp" aria-label={t("Green Market, good finds daily")}>
        <span>GREEN MARKET</span>
        <strong>g</strong>
      </div>
      <div className="hero-image-caption" aria-live="polite">
        <span>{t("FRESH PICKS")}</span>
        <span>{t(heroSlides[activeSlide].caption)}</span>
      </div>
    </section>
  );
}

export default Hero;
