import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/Product.js";

dotenv.config();

const products = [
  {
    slug: "sun-ripened-strawberries",
    name: "Sun-ripened strawberries",
    description: "Sweet, fragrant berries picked at their best.",
    price: 6.5,
    category: "Fruit",
    stock: 24,
    imageUrl: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Fresh red strawberries",
  },
  {
    slug: "market-cherries",
    name: "Market cherries",
    description: "Glossy, sweet cherries for a little afternoon treat.",
    price: 8,
    category: "Fruit",
    stock: 18,
    imageUrl: "https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Fresh ripe cherries",
  },
  {
    slug: "golden-pineapple",
    name: "Golden pineapple",
    description: "Bright, juicy and ready to share.",
    price: 5.75,
    category: "Fruit",
    stock: 16,
    imageUrl: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Ripe golden pineapple",
  },
  {
    slug: "everyday-bananas",
    name: "Everyday bananas",
    description: "Naturally sweet fruit for breakfasts and busy days.",
    price: 3.25,
    category: "Fruit",
    stock: 30,
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Fresh yellow bananas",
  },
  {
    slug: "sunshine-oranges",
    name: "Sunshine oranges",
    description: "A bright citrus pick, full of fresh flavour.",
    price: 4.5,
    category: "Fruit",
    stock: 26,
    imageUrl: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Fresh oranges in sunlight",
  },
  {
    slug: "market-fruit-selection",
    name: "Market fruit selection",
    description: "A colourful mix of seasonal fruit from the market.",
    price: 12,
    category: "Fruit",
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Assorted fresh fruits at a market",
  },
  {
    slug: "country-sourdough",
    name: "Country sourdough",
    description: "A crusty, slow-fermented loaf for the table.",
    price: 7.5,
    category: "Food",
    stock: 14,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Fresh rustic sourdough bread",
  },
  {
    slug: "house-coffee-beans",
    name: "House coffee beans",
    description: "A smooth, balanced roast for slow mornings.",
    price: 16,
    category: "Food",
    stock: 20,
    imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Roasted coffee beans",
  },
  {
    slug: "garden-vegetable-box",
    name: "Garden vegetable box",
    description: "A fresh market mix for easy weeknight cooking.",
    price: 14,
    category: "Food",
    stock: 10,
    imageUrl: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Fresh vegetables at a market stand",
  },
  {
    slug: "studio-wireless-headphones",
    name: "Studio wireless headphones",
    description: "Comfortable over-ear sound for work and winding down.",
    price: 89,
    category: "Devices",
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Black wireless headphones",
  },
  {
    slug: "everyday-smartphone",
    name: "Everyday smartphone",
    description: "A clean, capable device for the everyday essentials.",
    price: 429,
    category: "Devices",
    stock: 6,
    imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Smartphone beside a laptop keyboard",
  },
  {
    slug: "lightweight-laptop",
    name: "Lightweight laptop",
    description: "A slim everyday computer for work from anywhere.",
    price: 899,
    category: "Devices",
    stock: 5,
    imageUrl: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Laptop open on a wooden desk",
  },
  {
    slug: "smart-watch",
    name: "Smart watch",
    description: "A simple, useful companion for days on the go.",
    price: 169,
    category: "Devices",
    stock: 7,
    imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Smart watch with dark band",
  },
  {
    slug: "botanical-hand-wash",
    name: "Botanical hand wash",
    description: "A gentle daily cleanser with a fresh botanical scent.",
    price: 18,
    category: "Care",
    stock: 16,
    imageUrl: "https://images.unsplash.com/photo-1616750819456-5cdee9b85d22?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Minimal skincare product on a glass surface",
  },
  {
    slug: "sculptural-vase",
    name: "Sculptural vase",
    description: "A quiet statement piece for a favourite corner.",
    price: 48,
    category: "Home",
    stock: 9,
    imageUrl: "https://images.unsplash.com/photo-1644682973669-c81e90336245?auto=format&fit=crop&w=900&q=85",
    imageAlt: "White vase with pink flowers",
  },
];

async function seedProducts() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI or MONGO_URI is required to seed products");
  }

  await mongoose.connect(mongoUri);
  let inserted = 0;

  for (const product of products) {
    const result = await Product.updateOne(
      { slug: product.slug },
      { $setOnInsert: product },
      { upsert: true }
    );
    inserted += result.upsertedCount;
  }

  console.log(`Product seed complete: added ${inserted} new products (${products.length} in catalog).`);
}

seedProducts()
  .catch((error) => {
    console.error("Product seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
