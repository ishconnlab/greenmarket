function Hero() {
  return (
    <section className="hero">
      <div className="hero-image" role="img" aria-label="Fresh seasonal produce arranged for the market" />
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> A BRIGHTER KIND OF EVERYDAY</span>
        <h1>The everyday,<br />well <em>chosen.</em></h1>
        <p>Fruit for the week, pantry staples, and useful things for home and on the go. Good finds, all in one place.</p>
        <div className="hero-actions">
          <a className="hero-link" href="#shop">Explore the collection <span aria-hidden="true">↗</span></a>
          <span className="hero-note">A little more lovely, every day.</span>
        </div>
      </div>
      <div className="hero-image-caption"><span>FRESH PICKS</span><span>From the market to your everyday</span></div>
    </section>
  );
}

export default Hero;
