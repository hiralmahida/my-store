// Database seed script.
//
// Run with:  npx prisma db seed
// (configured via the `migrations.seed` command in prisma.config.ts)
//
// It wipes the catalog tables and inserts a fresh set of ORIGINAL sample data:
// 8 categories, 8 invented brands, and 20 products with placeholder images and
// QAR prices. All brand/product text here is made up for this demo.
//
// We import PrismaClient with a RELATIVE path (not the "@/..." alias) because
// this file is executed by `tsx`, which does not read the TypeScript path
// aliases the way the Next.js bundler does.
import "dotenv/config"; // load DATABASE_URL from .env when run via tsx
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter (see src/lib/prisma.ts for the full note).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Build a placeholder image URL. placehold.co renders text on a colored square,
// which is perfect for demo products without shipping real photos.
function placeholder(label: string): string {
  const text = encodeURIComponent(label);
  return `https://placehold.co/600x600/0f172a/e2e8f0?text=${text}`;
}

// --- Static seed data ------------------------------------------------------

const categories: { name: string; slug: string }[] = [
  { name: "Mobile Phones", slug: "mobile-phones" },
  { name: "Laptops", slug: "laptops" },
  { name: "Tablets", slug: "tablets" },
  { name: "Smart Watches", slug: "smart-watches" },
  { name: "Audio", slug: "audio" },
  { name: "Smart Home", slug: "smart-home" },
  { name: "Gaming", slug: "gaming" },
  { name: "Accessories", slug: "accessories" },
];

const brands: { name: string; slug: string }[] = [
  { name: "Aurora", slug: "aurora" },
  { name: "Nimbus", slug: "nimbus" },
  { name: "Vertex", slug: "vertex" },
  { name: "Lumen", slug: "lumen" },
  { name: "Cobalt", slug: "cobalt" },
  { name: "Zephyr", slug: "zephyr" },
  { name: "Onyx", slug: "onyx" },
  { name: "Pulse", slug: "pulse" },
];

// Each product references a category and brand by slug; we resolve those to IDs
// after the categories/brands are created.
type SeedProduct = {
  name: string;
  slug: string;
  description: string;
  price: number; // QAR
  stock: number;
  featured: boolean;
  categorySlug: string;
  brandSlug: string;
  specs: Record<string, string | number | boolean>;
};

const products: SeedProduct[] = [
  // --- Mobile Phones ---
  {
    name: "Aurora Flux 5G (256GB)",
    slug: "aurora-flux-5g-256gb",
    description:
      "A flagship 6.7-inch OLED phone with a triple camera system, all-day battery, and blazing 5G speeds.",
    price: 3499,
    stock: 24,
    featured: true,
    categorySlug: "mobile-phones",
    brandSlug: "aurora",
    specs: { display: "6.7\" OLED 120Hz", storage: "256GB", ram: "8GB", camera: "50MP triple", battery: "5000mAh" },
  },
  {
    name: "Vertex Mini X (128GB)",
    slug: "vertex-mini-x-128gb",
    description:
      "Compact 6.1-inch phone that fits one-handed use without compromising on performance.",
    price: 2199,
    stock: 40,
    featured: false,
    categorySlug: "mobile-phones",
    brandSlug: "vertex",
    specs: { display: "6.1\" OLED", storage: "128GB", ram: "6GB", camera: "48MP dual", battery: "4000mAh" },
  },
  {
    name: "Cobalt Note Pro (512GB)",
    slug: "cobalt-note-pro-512gb",
    description:
      "Productivity powerhouse with a built-in stylus, huge display, and 512GB of storage.",
    price: 4299,
    stock: 12,
    featured: true,
    categorySlug: "mobile-phones",
    brandSlug: "cobalt",
    specs: { display: "6.8\" AMOLED", storage: "512GB", ram: "12GB", stylus: true, battery: "5100mAh" },
  },

  // --- Laptops ---
  {
    name: "Nimbus Air 14",
    slug: "nimbus-air-14",
    description:
      "Ultra-thin 14-inch laptop weighing just 1.2kg, with a silent fanless design and 18-hour battery.",
    price: 5499,
    stock: 18,
    featured: true,
    categorySlug: "laptops",
    brandSlug: "nimbus",
    specs: { display: "14\" Retina", cpu: "8-core", ram: "16GB", storage: "512GB SSD", weight: "1.2kg" },
  },
  {
    name: "Vertex ProBook 16",
    slug: "vertex-probook-16",
    description:
      "A 16-inch creator laptop with a color-accurate display and dedicated graphics for editing and design.",
    price: 7899,
    stock: 9,
    featured: true,
    categorySlug: "laptops",
    brandSlug: "vertex",
    specs: { display: "16\" 3K", cpu: "12-core", gpu: "8GB dedicated", ram: "32GB", storage: "1TB SSD" },
  },
  {
    name: "Cobalt Stream 15",
    slug: "cobalt-stream-15",
    description:
      "Reliable everyday 15-inch laptop for study and work, with a comfortable keyboard and fast SSD.",
    price: 2999,
    stock: 30,
    featured: false,
    categorySlug: "laptops",
    brandSlug: "cobalt",
    specs: { display: "15.6\" FHD", cpu: "6-core", ram: "8GB", storage: "256GB SSD" },
  },

  // --- Tablets ---
  {
    name: "Lumen Slate 11",
    slug: "lumen-slate-11",
    description:
      "An 11-inch tablet with a laminated display and optional keyboard cover, great for notes and streaming.",
    price: 2599,
    stock: 22,
    featured: true,
    categorySlug: "tablets",
    brandSlug: "lumen",
    specs: { display: "11\" LCD 120Hz", storage: "128GB", ram: "6GB", battery: "8000mAh" },
  },
  {
    name: "Aurora Tab Ultra 13",
    slug: "aurora-tab-ultra-13",
    description:
      "Large 13-inch OLED tablet built for creatives, bundled with an ultra-low-latency pen.",
    price: 4599,
    stock: 8,
    featured: false,
    categorySlug: "tablets",
    brandSlug: "aurora",
    specs: { display: "13\" OLED", storage: "256GB", ram: "8GB", pen: true },
  },

  // --- Smart Watches ---
  {
    name: "Pulse Watch Active 2",
    slug: "pulse-watch-active-2",
    description:
      "A lightweight fitness watch with GPS, heart-rate and SpO2 sensors, and a 7-day battery.",
    price: 899,
    stock: 50,
    featured: true,
    categorySlug: "smart-watches",
    brandSlug: "pulse",
    specs: { display: "1.4\" AMOLED", gps: true, waterResistance: "5ATM", battery: "7 days" },
  },
  {
    name: "Onyx Chrono S",
    slug: "onyx-chrono-s",
    description:
      "A premium stainless-steel smartwatch with LTE, contactless payments, and a sapphire crystal face.",
    price: 1799,
    stock: 15,
    featured: false,
    categorySlug: "smart-watches",
    brandSlug: "onyx",
    specs: { display: "1.5\" AMOLED", lte: true, material: "Stainless steel", battery: "3 days" },
  },

  // --- Audio ---
  {
    name: "Zephyr Buds Pro",
    slug: "zephyr-buds-pro",
    description:
      "Wireless earbuds with active noise cancellation, spatial audio, and a compact charging case.",
    price: 649,
    stock: 60,
    featured: true,
    categorySlug: "audio",
    brandSlug: "zephyr",
    specs: { anc: true, driver: "11mm", battery: "30h with case", bluetooth: "5.3" },
  },
  {
    name: "Lumen Studio Headphones",
    slug: "lumen-studio-headphones",
    description:
      "Over-ear headphones with plush memory-foam cushions and rich, balanced sound for long sessions.",
    price: 1099,
    stock: 20,
    featured: false,
    categorySlug: "audio",
    brandSlug: "lumen",
    specs: { anc: true, driver: "40mm", battery: "40h", weight: "250g" },
  },
  {
    name: "Pulse SoundBar 300",
    slug: "pulse-soundbar-300",
    description:
      "A 2.1-channel soundbar with a wireless subwoofer that brings cinema audio to your living room.",
    price: 1499,
    stock: 14,
    featured: false,
    categorySlug: "audio",
    brandSlug: "pulse",
    specs: { channels: "2.1", power: "300W", subwoofer: "Wireless", inputs: "HDMI ARC, Optical" },
  },

  // --- Smart Home ---
  {
    name: "Nimbus Hub Mini",
    slug: "nimbus-hub-mini",
    description:
      "A compact smart-home hub and voice assistant that controls lights, plugs, and sensors.",
    price: 379,
    stock: 45,
    featured: false,
    categorySlug: "smart-home",
    brandSlug: "nimbus",
    specs: { voice: true, protocols: "Wi-Fi, Zigbee", speaker: true },
  },
  {
    name: "Lumen Smart Bulb (4-pack)",
    slug: "lumen-smart-bulb-4-pack",
    description:
      "Color-changing smart bulbs with 16 million colors, schedules, and app control.",
    price: 249,
    stock: 70,
    featured: true,
    categorySlug: "smart-home",
    brandSlug: "lumen",
    specs: { colors: "16M", pack: 4, wattage: "9W", app: true },
  },

  // --- Gaming ---
  {
    name: "Vertex Console X",
    slug: "vertex-console-x",
    description:
      "A next-gen 4K gaming console with a lightning-fast SSD and a redesigned haptic controller.",
    price: 2299,
    stock: 10,
    featured: true,
    categorySlug: "gaming",
    brandSlug: "vertex",
    specs: { resolution: "4K 120fps", storage: "1TB SSD", ray_tracing: true },
  },
  {
    name: "Onyx Mech Keyboard TKL",
    slug: "onyx-mech-keyboard-tkl",
    description:
      "A tenkeyless mechanical keyboard with hot-swappable switches and per-key RGB lighting.",
    price: 549,
    stock: 33,
    featured: false,
    categorySlug: "gaming",
    brandSlug: "onyx",
    specs: { layout: "TKL", switches: "Hot-swappable", rgb: true, connection: "USB-C" },
  },
  {
    name: "Zephyr Pro Controller",
    slug: "zephyr-pro-controller",
    description:
      "A wireless pro controller with back paddles, adjustable triggers, and low-latency response.",
    price: 429,
    stock: 26,
    featured: false,
    categorySlug: "gaming",
    brandSlug: "zephyr",
    specs: { wireless: true, paddles: 4, battery: "20h" },
  },

  // --- Accessories ---
  {
    name: "Cobalt 100W GaN Charger",
    slug: "cobalt-100w-gan-charger",
    description:
      "A tiny 100W GaN charger with three ports that can power a laptop, tablet, and phone at once.",
    price: 229,
    stock: 80,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "cobalt",
    specs: { power: "100W", ports: 3, technology: "GaN" },
  },
  {
    name: "Aurora PowerBank 20K",
    slug: "aurora-powerbank-20k",
    description:
      "A 20,000mAh power bank with fast charging and a built-in USB-C cable for travel days.",
    price: 199,
    stock: 90,
    featured: true,
    categorySlug: "accessories",
    brandSlug: "aurora",
    specs: { capacity: "20000mAh", output: "45W", builtInCable: true },
  },
];

async function main() {
  console.log("🌱  Seeding database…");

  // 1. Clear existing data in FK-safe order (children before parents).
  //    This makes the seed re-runnable without unique-constraint errors.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();

  // 2. Create categories and brands, remembering slug -> id so we can link
  //    products to them.
  const categoryIdBySlug = new Map<string, string>();
  for (const category of categories) {
    const created = await prisma.category.create({ data: category });
    categoryIdBySlug.set(created.slug, created.id);
  }

  const brandIdBySlug = new Map<string, string>();
  for (const brand of brands) {
    const created = await prisma.brand.create({ data: brand });
    brandIdBySlug.set(created.slug, created.id);
  }

  // 3. Create products, each with one placeholder image.
  for (const p of products) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    const brandId = brandIdBySlug.get(p.brandSlug);
    if (!categoryId || !brandId) {
      throw new Error(`Missing category/brand for product ${p.slug}`);
    }

    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        featured: p.featured,
        specs: p.specs,
        categoryId,
        brandId,
        images: {
          create: [{ url: placeholder(p.name), alt: p.name }],
        },
      },
    });
  }

  console.log(
    `✅  Seeded ${categories.length} categories, ${brands.length} brands, ${products.length} products.`
  );
}

main()
  .catch((error) => {
    console.error("❌  Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
