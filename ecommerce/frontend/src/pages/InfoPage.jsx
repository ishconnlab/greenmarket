import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

const pages = {
  help: {
    eyebrow: "HERE TO HELP",
    title: "Help centre",
    intro: "Find help with your account, orders, payments, or delivery.",
    sections: [
      ["Orders", "Sign in and open Order history to review the latest fulfilment and payment status. Order updates are also available as browser notifications when you enable them in your profile."],
      ["Payments", "Choose MTN MoMo, Airtel Money, or Bank of Kigali at checkout. Mobile-money orders include a secure USSD hand-off; for Bank of Kigali, contact the store for its transfer details. Payment is not automatic; the store confirms it after checking the payment. Never enter a payment PIN on this website."],
      ["Need a hand?", "Send a support message, wish, or issue report from your profile. Our team’s reply will appear in your profile inbox."],
    ],
  },
  guide: {
    eyebrow: "A SIMPLE WAY TO SHOP",
    title: "Shopping guide",
    intro: "A few quick steps from finding something useful to following your order.",
    sections: [
      ["1. Find your favourites", "Browse the catalog, search for a product, and add available items to your bag."],
      ["2. Check out securely", "Sign in, enter your delivery address, choose MTN MoMo, Airtel Money, or Bank of Kigali, and provide the payer's phone or account number. Your order total and item list are shown before placing the order."],
      ["3. Complete payment", "Use the provider’s secure USSD prompt on your phone. Green Market never asks for your payment PIN."],
      ["4. Follow your order", "Open Order history to see status and payment confirmation. Enable notifications in your profile for updates when you are away from the site."],
    ],
  },
  policies: {
    eyebrow: "CLEAR AND FAIR",
    title: "Store policies",
    intro: "Important information about orders, fulfilment, payments, and support.",
    sections: [
      ["Order fulfilment", "Orders move through pending, processing, shipped, and delivered. An order may be cancelled when necessary; its reserved stock is then returned."],
      ["Payment confirmation", "Mobile-money payment is completed with your provider; Bank of Kigali transfers are confirmed by the store. Orders remain awaiting confirmation until the store verifies payment and marks it paid."],
      ["Product availability", "Stock is reserved when an order is placed. If an item is unavailable, contact support from your profile."],
      ["Questions or concerns", "Sign in and submit a message or report from your profile. Replies are kept in your account inbox."],
    ],
  },
  privacy: {
    eyebrow: "YOUR INFORMATION",
    title: "Privacy",
    intro: "We use account and order information to operate the store and provide customer support.",
    sections: [
      ["Account and order details", "Your name, email, delivery address, payment method, payer phone or bank account number, cart, and order details are used to manage your account and fulfil your orders. Payer account details are visible only to you and authorised administrators handling that order."],
      ["Support conversations", "Messages, wishes, issue reports, and replies are associated with your signed-in account so you and authorised store administrators can view the conversation."],
      ["Notifications", "Browser push notifications are optional. If enabled, the browser’s subscription is stored with your account so the store can send order and support updates. You can disable notifications in your profile or browser settings."],
      ["Payment safety", "The site does not request or store your mobile-money or banking PIN. Payer phone and account numbers are stored with the order and shared only with the customer and authorised administrators handling it."],
      ["Contact", "For a privacy question, contact info@greenmarket.rw or write to ishconnlab@gmail.com."],
    ],
  },
};

function InfoPage({ page }) {
  const content = pages[page];
  const { t } = useLanguage();

  return (
    <main className="info-page">
      <Link className="back-link" to="/">← {t("Back to shopping")}</Link>
      <span className="eyebrow muted-eyebrow">{t(content.eyebrow)}</span>
      <h1>{t(content.title)}</h1>
      <p className="info-intro">{t(content.intro)}</p>
      <div className="info-sections">
        {content.sections.map(([title, body]) => (
          <section className="info-card" key={title}>
            <h2>{t(title)}</h2>
            <p>{t(body)}</p>
          </section>
        ))}
      </div>
      <Link className="primary-button info-contact-link" to="/profile#contact">{t("Contact Green Market")}</Link>
    </main>
  );
}

export default InfoPage;
