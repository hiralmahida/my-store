// Database seed script.
//
// Run with:  npx prisma db seed
// (configured via the `migrations.seed` command in prisma.config.ts)
//
// It wipes the catalog tables and inserts a fresh demo catalog for FirstStop:
// 6 top-level categories, real electronics brands, and 40+ products with QAR
// prices, tech specs, and several placeholder images each (so the product
// detail gallery has thumbnails to switch between).
//
// The brand and product names reference real-world electronics for a realistic
// demo. No real product photos are shipped — images are generated placeholders.
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
// which is fine for a demo without real product photography. We vary the label
// per angle so a product's gallery thumbnails are visibly different.
function placeholder(label: string, angle: string, bg = "0f172a"): string {
  const text = encodeURIComponent(`${label}\n${angle}`);
  return `https://placehold.co/800x800/${bg}/e2e8f0?text=${text}`;
}

// Produce the 3 gallery images every product gets: front / side / back.
function galleryFor(name: string) {
  return [
    { url: placeholder(name, "Front", "0f172a"), alt: `${name} — front view` },
    { url: placeholder(name, "Side", "1e293b"), alt: `${name} — side view` },
    { url: placeholder(name, "Back", "334155"), alt: `${name} — back view` },
  ];
}

// --- Static seed data ------------------------------------------------------

// The six category tiles shown on the storefront. `image` is a wide banner
// placeholder used on category landing pages.
const categories: { name: string; slug: string; image: string }[] = [
  { name: "Phones", slug: "phones", image: placeholder("Phones", "", "1d4ed8") },
  { name: "Laptops", slug: "laptops", image: placeholder("Laptops", "", "0f766e") },
  { name: "Tablets", slug: "tablets", image: placeholder("Tablets", "", "7c3aed") },
  { name: "TVs", slug: "tvs", image: placeholder("TVs", "", "b45309") },
  { name: "Home Appliances", slug: "appliances", image: placeholder("Appliances", "", "be123c") },
  { name: "Accessories", slug: "accessories", image: placeholder("Accessories", "", "0369a1") },
];

// Real electronics brands used across the catalog.
const brands: { name: string; slug: string }[] = [
  { name: "Apple", slug: "apple" },
  { name: "Samsung", slug: "samsung" },
  { name: "Sony", slug: "sony" },
  { name: "LG", slug: "lg" },
  { name: "HP", slug: "hp" },
  { name: "Dell", slug: "dell" },
  { name: "Lenovo", slug: "lenovo" },
  { name: "Asus", slug: "asus" },
  { name: "Google", slug: "google" },
  { name: "Microsoft", slug: "microsoft" },
  { name: "Bose", slug: "bose" },
  { name: "Anker", slug: "anker" },
  { name: "Dyson", slug: "dyson" },
  { name: "Logitech", slug: "logitech" },
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
  // --- Phones ---------------------------------------------------------------
  {
    name: "Apple iPhone 15 Pro (256GB)",
    slug: "apple-iphone-15-pro-256gb",
    description:
      "Titanium flagship with the A17 Pro chip, a 6.1-inch ProMotion display, and a pro camera system with 5x telephoto zoom.",
    price: 4699,
    stock: 22,
    featured: true,
    categorySlug: "phones",
    brandSlug: "apple",
    specs: { display: '6.1" OLED 120Hz', chip: "A17 Pro", storage: "256GB", camera: "48MP triple", material: "Titanium" },
  },
  {
    name: "Apple iPhone 15 (128GB)",
    slug: "apple-iphone-15-128gb",
    description:
      "The everyday iPhone with the Dynamic Island, a 48MP main camera, and USB-C charging.",
    price: 3399,
    stock: 35,
    featured: true,
    categorySlug: "phones",
    brandSlug: "apple",
    specs: { display: '6.1" OLED', chip: "A16 Bionic", storage: "128GB", camera: "48MP dual", port: "USB-C" },
  },
  {
    name: "Apple iPhone 14 (128GB)",
    slug: "apple-iphone-14-128gb",
    description:
      "A dependable dual-camera iPhone with all-day battery life and crash detection, now at a friendlier price.",
    price: 2799,
    stock: 28,
    featured: false,
    categorySlug: "phones",
    brandSlug: "apple",
    specs: { display: '6.1" OLED', chip: "A15 Bionic", storage: "128GB", camera: "12MP dual" },
  },
  {
    name: "Samsung Galaxy S24 Ultra (512GB)",
    slug: "samsung-galaxy-s24-ultra-512gb",
    description:
      "Galaxy AI powerhouse with a built-in S Pen, a 200MP camera, and a 6.8-inch Dynamic AMOLED 2X display.",
    price: 5199,
    stock: 15,
    featured: true,
    categorySlug: "phones",
    brandSlug: "samsung",
    specs: { display: '6.8" AMOLED 120Hz', storage: "512GB", ram: "12GB", camera: "200MP quad", spen: true },
  },
  {
    name: "Samsung Galaxy S24 (256GB)",
    slug: "samsung-galaxy-s24-256gb",
    description:
      "Compact flagship with Galaxy AI features, a bright 6.2-inch display, and a versatile triple camera.",
    price: 3299,
    stock: 30,
    featured: false,
    categorySlug: "phones",
    brandSlug: "samsung",
    specs: { display: '6.2" AMOLED 120Hz', storage: "256GB", ram: "8GB", camera: "50MP triple" },
  },
  {
    name: "Samsung Galaxy A55 (128GB)",
    slug: "samsung-galaxy-a55-128gb",
    description:
      "A premium-feel mid-ranger with a metal frame, a smooth 120Hz screen, and a large 5000mAh battery.",
    price: 1499,
    stock: 44,
    featured: false,
    categorySlug: "phones",
    brandSlug: "samsung",
    specs: { display: '6.6" AMOLED 120Hz', storage: "128GB", ram: "8GB", battery: "5000mAh" },
  },
  {
    name: "Google Pixel 8 Pro (256GB)",
    slug: "google-pixel-8-pro-256gb",
    description:
      "Google's AI-first phone with the Tensor G3 chip, a pro triple camera, and seven years of updates.",
    price: 3699,
    stock: 18,
    featured: true,
    categorySlug: "phones",
    brandSlug: "google",
    specs: { display: '6.7" OLED 120Hz', chip: "Tensor G3", storage: "256GB", camera: "50MP triple" },
  },
  {
    name: "Sony Xperia 1 VI (256GB)",
    slug: "sony-xperia-1-vi-256gb",
    description:
      "A creator's phone with a 4K-class display, pro camera controls, and a dedicated shutter button.",
    price: 4599,
    stock: 9,
    featured: false,
    categorySlug: "phones",
    brandSlug: "sony",
    specs: { display: '6.5" OLED 120Hz', storage: "256GB", ram: "12GB", camera: "48MP triple" },
  },

  // --- Laptops --------------------------------------------------------------
  {
    name: "Apple MacBook Air 13 M3 (256GB)",
    slug: "apple-macbook-air-13-m3-256gb",
    description:
      "Impossibly thin and silent, fanless laptop with the M3 chip and up to 18 hours of battery life.",
    price: 4299,
    stock: 20,
    featured: true,
    categorySlug: "laptops",
    brandSlug: "apple",
    specs: { display: '13.6" Liquid Retina', chip: "Apple M3", ram: "8GB", storage: "256GB SSD", weight: "1.24kg" },
  },
  {
    name: "Apple MacBook Pro 14 M3 Pro",
    slug: "apple-macbook-pro-14-m3-pro",
    description:
      "Pro performance in a portable body with the M3 Pro chip, a stunning Liquid Retina XDR display, and MagSafe.",
    price: 8499,
    stock: 8,
    featured: true,
    categorySlug: "laptops",
    brandSlug: "apple",
    specs: { display: '14.2" Liquid Retina XDR', chip: "Apple M3 Pro", ram: "18GB", storage: "512GB SSD" },
  },
  {
    name: "Dell XPS 13 Plus",
    slug: "dell-xps-13-plus",
    description:
      "A striking ultrabook with an edge-to-edge keyboard, InfinityEdge display, and 13th-gen Intel Core power.",
    price: 5499,
    stock: 12,
    featured: false,
    categorySlug: "laptops",
    brandSlug: "dell",
    specs: { display: '13.4" FHD+', cpu: "Intel Core i7", ram: "16GB", storage: "512GB SSD" },
  },
  {
    name: "HP Spectre x360 14",
    slug: "hp-spectre-x360-14",
    description:
      "A premium 2-in-1 convertible with a gem-cut chassis, OLED touch display, and included pen.",
    price: 5999,
    stock: 10,
    featured: true,
    categorySlug: "laptops",
    brandSlug: "hp",
    specs: { display: '13.5" OLED touch', cpu: "Intel Core Ultra 7", ram: "16GB", storage: "1TB SSD", convertible: true },
  },
  {
    name: "HP Pavilion 15",
    slug: "hp-pavilion-15",
    description:
      "A reliable everyday 15-inch laptop for study and work, with a full-size keyboard and fast SSD.",
    price: 2599,
    stock: 26,
    featured: false,
    categorySlug: "laptops",
    brandSlug: "hp",
    specs: { display: '15.6" FHD', cpu: "Intel Core i5", ram: "8GB", storage: "512GB SSD" },
  },
  {
    name: "Lenovo ThinkPad X1 Carbon Gen 12",
    slug: "lenovo-thinkpad-x1-carbon-gen-12",
    description:
      "The classic business ultrabook: featherweight carbon-fiber build, legendary keyboard, and enterprise security.",
    price: 6999,
    stock: 7,
    featured: false,
    categorySlug: "laptops",
    brandSlug: "lenovo",
    specs: { display: '14" WUXGA', cpu: "Intel Core Ultra 7", ram: "32GB", storage: "1TB SSD", weight: "1.09kg" },
  },
  {
    name: "Lenovo Yoga Slim 7",
    slug: "lenovo-yoga-slim-7",
    description:
      "A sleek all-day companion with a vivid display, quiet cooling, and rapid charging.",
    price: 3799,
    stock: 16,
    featured: false,
    categorySlug: "laptops",
    brandSlug: "lenovo",
    specs: { display: '14" 2.8K OLED', cpu: "AMD Ryzen 7", ram: "16GB", storage: "512GB SSD" },
  },
  {
    name: "Asus ZenBook 14 OLED",
    slug: "asus-zenbook-14-oled",
    description:
      "A lightweight creator laptop with a gorgeous OLED panel, Intel Core Ultra performance, and a NumberPad trackpad.",
    price: 3999,
    stock: 14,
    featured: true,
    categorySlug: "laptops",
    brandSlug: "asus",
    specs: { display: '14" 3K OLED', cpu: "Intel Core Ultra 5", ram: "16GB", storage: "512GB SSD" },
  },

  // --- Tablets --------------------------------------------------------------
  {
    name: "Apple iPad Pro 11 M4 (256GB)",
    slug: "apple-ipad-pro-11-m4-256gb",
    description:
      "The thinnest Apple device ever, with a breathtaking Ultra Retina XDR display and the blistering M4 chip.",
    price: 4399,
    stock: 13,
    featured: true,
    categorySlug: "tablets",
    brandSlug: "apple",
    specs: { display: '11" Ultra Retina XDR', chip: "Apple M4", storage: "256GB", pencil: "Apple Pencil Pro" },
  },
  {
    name: "Apple iPad Air 11 M2 (128GB)",
    slug: "apple-ipad-air-11-m2-128gb",
    description:
      "A versatile, colorful iPad with M2 power — great for note-taking, drawing, and streaming.",
    price: 2799,
    stock: 21,
    featured: false,
    categorySlug: "tablets",
    brandSlug: "apple",
    specs: { display: '11" Liquid Retina', chip: "Apple M2", storage: "128GB" },
  },
  {
    name: "Apple iPad (10th gen, 64GB)",
    slug: "apple-ipad-10th-gen-64gb",
    description:
      "The all-round iPad in fun colors with a 10.9-inch display and USB-C, perfect for the whole family.",
    price: 1599,
    stock: 32,
    featured: false,
    categorySlug: "tablets",
    brandSlug: "apple",
    specs: { display: '10.9" Liquid Retina', chip: "A14 Bionic", storage: "64GB", port: "USB-C" },
  },
  {
    name: "Samsung Galaxy Tab S9 (256GB)",
    slug: "samsung-galaxy-tab-s9-256gb",
    description:
      "A premium Android tablet with a Dynamic AMOLED 2X screen, included S Pen, and IP68 water resistance.",
    price: 3499,
    stock: 15,
    featured: true,
    categorySlug: "tablets",
    brandSlug: "samsung",
    specs: { display: '11" AMOLED 120Hz', storage: "256GB", ram: "12GB", spen: true, rating: "IP68" },
  },
  {
    name: "Lenovo Tab P12",
    slug: "lenovo-tab-p12",
    description:
      "A big-screen entertainment tablet with quad speakers and an included pen for notes and sketches.",
    price: 1499,
    stock: 19,
    featured: false,
    categorySlug: "tablets",
    brandSlug: "lenovo",
    specs: { display: '12.7" 3K', storage: "128GB", ram: "8GB", speakers: "Quad JBL" },
  },
  {
    name: "Microsoft Surface Pro 11",
    slug: "microsoft-surface-pro-11",
    description:
      "A tablet that's also a laptop: a detachable Copilot+ PC with all-day battery and an optional keyboard.",
    price: 5499,
    stock: 9,
    featured: false,
    categorySlug: "tablets",
    brandSlug: "microsoft",
    specs: { display: '13" OLED', chip: "Snapdragon X Elite", ram: "16GB", storage: "512GB SSD" },
  },

  // --- TVs ------------------------------------------------------------------
  {
    name: 'Samsung 65" Neo QLED 4K QN90D',
    slug: "samsung-65-neo-qled-4k-qn90d",
    description:
      "A dazzling Mini LED TV with Quantum Matrix backlighting, anti-glare screen, and a 144Hz gaming mode.",
    price: 5999,
    stock: 11,
    featured: true,
    categorySlug: "tvs",
    brandSlug: "samsung",
    specs: { size: '65"', panel: "Neo QLED Mini LED", resolution: "4K", refresh: "144Hz", hdr: "Quantum HDR" },
  },
  {
    name: 'Samsung 55" Crystal UHD DU8000',
    slug: "samsung-55-crystal-uhd-du8000",
    description:
      "A sleek 4K TV with vivid Dynamic Crystal Color and smart features for everyday streaming.",
    price: 2299,
    stock: 20,
    featured: false,
    categorySlug: "tvs",
    brandSlug: "samsung",
    specs: { size: '55"', panel: "Crystal UHD", resolution: "4K", refresh: "60Hz" },
  },
  {
    name: 'Samsung 75" Crystal UHD DU7000',
    slug: "samsung-75-crystal-uhd-du7000",
    description:
      "A big-screen 75-inch 4K TV that turns the living room into a cinema, with slim bezels and smart apps.",
    price: 3999,
    stock: 7,
    featured: false,
    categorySlug: "tvs",
    brandSlug: "samsung",
    specs: { size: '75"', panel: "Crystal UHD", resolution: "4K", refresh: "60Hz" },
  },
  {
    name: 'LG 65" OLED evo C4',
    slug: "lg-65-oled-evo-c4",
    description:
      "Self-lit OLED pixels deliver perfect blacks and infinite contrast, with a 144Hz panel built for gaming.",
    price: 7499,
    stock: 9,
    featured: true,
    categorySlug: "tvs",
    brandSlug: "lg",
    specs: { size: '65"', panel: "OLED evo", resolution: "4K", refresh: "144Hz", processor: "α9 AI Gen7" },
  },
  {
    name: 'LG 55" UHD UR8050',
    slug: "lg-55-uhd-ur8050",
    description:
      "An affordable 4K smart TV with the webOS platform, AI upscaling, and a slim design.",
    price: 2499,
    stock: 18,
    featured: false,
    categorySlug: "tvs",
    brandSlug: "lg",
    specs: { size: '55"', panel: "LED UHD", resolution: "4K", refresh: "60Hz", os: "webOS" },
  },
  {
    name: 'Sony 65" BRAVIA 7 Mini LED',
    slug: "sony-65-bravia-7-mini-led",
    description:
      "A cinematic Mini LED TV tuned with the XR Processor for lifelike contrast, color, and clarity.",
    price: 6999,
    stock: 6,
    featured: false,
    categorySlug: "tvs",
    brandSlug: "sony",
    specs: { size: '65"', panel: "Mini LED", resolution: "4K", refresh: "120Hz", processor: "XR" },
  },
  {
    name: 'Sony 55" BRAVIA 3 4K',
    slug: "sony-55-bravia-3-4k",
    description:
      "A well-rounded 4K HDR TV with Google TV built in and rich, natural picture quality.",
    price: 3199,
    stock: 14,
    featured: false,
    categorySlug: "tvs",
    brandSlug: "sony",
    specs: { size: '55"', panel: "LED 4K", resolution: "4K", refresh: "60Hz", os: "Google TV" },
  },

  // --- Home Appliances ------------------------------------------------------
  {
    name: "LG 8kg Front Load Washing Machine",
    slug: "lg-8kg-front-load-washing-machine",
    description:
      "A quiet, efficient washer with an AI Direct Drive motor, steam cycle, and a 10-year motor warranty.",
    price: 2199,
    stock: 17,
    featured: true,
    categorySlug: "appliances",
    brandSlug: "lg",
    specs: { capacity: "8kg", type: "Front load", motor: "AI Direct Drive", steam: true, energy: "A+++" },
  },
  {
    name: "Samsung 9kg Washer Dryer Combo",
    slug: "samsung-9kg-washer-dryer-combo",
    description:
      "Wash and dry in one machine with EcoBubble technology and a hygiene steam cycle.",
    price: 3499,
    stock: 10,
    featured: false,
    categorySlug: "appliances",
    brandSlug: "samsung",
    specs: { washCapacity: "9kg", dryCapacity: "6kg", type: "Washer dryer", feature: "EcoBubble" },
  },
  {
    name: "LG 471L French Door Refrigerator",
    slug: "lg-471l-french-door-refrigerator",
    description:
      "A spacious French-door fridge with a linear inverter compressor and Door Cooling+ for even temperatures.",
    price: 4999,
    stock: 8,
    featured: true,
    categorySlug: "appliances",
    brandSlug: "lg",
    specs: { capacity: "471L", type: "French door", compressor: "Linear Inverter", feature: "Door Cooling+" },
  },
  {
    name: "Samsung 680L Side-by-Side Refrigerator",
    slug: "samsung-680l-side-by-side-refrigerator",
    description:
      "A large side-by-side fridge freezer with SpaceMax insulation, a water dispenser, and Twin Cooling Plus.",
    price: 5799,
    stock: 6,
    featured: false,
    categorySlug: "appliances",
    brandSlug: "samsung",
    specs: { capacity: "680L", type: "Side-by-side", dispenser: "Water & ice", feature: "Twin Cooling Plus" },
  },
  {
    name: "Dyson V15 Detect Cordless Vacuum",
    slug: "dyson-v15-detect-cordless-vacuum",
    description:
      "A powerful cordless vacuum with a laser that reveals hidden dust and a screen that counts particles.",
    price: 2999,
    stock: 13,
    featured: true,
    categorySlug: "appliances",
    brandSlug: "dyson",
    specs: { type: "Cordless stick", runtime: "60 min", feature: "Laser dust detection", bin: "0.76L" },
  },
  {
    name: "Dyson Purifier Hot+Cool",
    slug: "dyson-purifier-hot-cool",
    description:
      "A HEPA air purifier that heats in winter and cools in summer, capturing 99.95% of fine particles.",
    price: 2499,
    stock: 11,
    featured: false,
    categorySlug: "appliances",
    brandSlug: "dyson",
    specs: { filter: "HEPA H13", modes: "Heat, cool, purify", coverage: "Whole room" },
  },
  {
    name: "Samsung 40L Convection Microwave Oven",
    slug: "samsung-40l-convection-microwave-oven",
    description:
      "A versatile microwave that also bakes, grills, and roasts, with a ceramic enamel interior.",
    price: 899,
    stock: 22,
    featured: false,
    categorySlug: "appliances",
    brandSlug: "samsung",
    specs: { capacity: "40L", type: "Convection", power: "900W", interior: "Ceramic enamel" },
  },

  // --- Accessories ----------------------------------------------------------
  {
    name: "Apple AirPods Pro (2nd gen, USB-C)",
    slug: "apple-airpods-pro-2nd-gen-usb-c",
    description:
      "Wireless earbuds with up to 2x more active noise cancellation, Adaptive Audio, and a USB-C case.",
    price: 899,
    stock: 55,
    featured: true,
    categorySlug: "accessories",
    brandSlug: "apple",
    specs: { anc: true, chip: "H2", battery: "30h with case", case: "USB-C MagSafe" },
  },
  {
    name: "Apple Watch Series 10 (46mm GPS)",
    slug: "apple-watch-series-10-46mm-gps",
    description:
      "The thinnest Apple Watch yet, with a bigger wide-angle OLED display and advanced health sensors.",
    price: 1799,
    stock: 24,
    featured: true,
    categorySlug: "accessories",
    brandSlug: "apple",
    specs: { display: '46mm OLED', gps: true, sensors: "ECG, SpO2", waterResistance: "50m" },
  },
  {
    name: "Samsung Galaxy Watch 7 (44mm)",
    slug: "samsung-galaxy-watch-7-44mm",
    description:
      "A sleek smartwatch with advanced sleep and body composition tracking, powered by Wear OS.",
    price: 1199,
    stock: 27,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "samsung",
    specs: { display: '44mm AMOLED', os: "Wear OS", sensors: "BioActive", gps: true },
  },
  {
    name: "Sony WH-1000XM5 Wireless Headphones",
    slug: "sony-wh-1000xm5-wireless-headphones",
    description:
      "Industry-leading noise-cancelling over-ear headphones with 30-hour battery and crystal-clear calls.",
    price: 1499,
    stock: 21,
    featured: true,
    categorySlug: "accessories",
    brandSlug: "sony",
    specs: { anc: true, battery: "30h", driver: "30mm", weight: "250g" },
  },
  {
    name: "Bose SoundLink Flex Bluetooth Speaker",
    slug: "bose-soundlink-flex-bluetooth-speaker",
    description:
      "A rugged, waterproof portable speaker with surprisingly big sound and up to 12 hours of playtime.",
    price: 649,
    stock: 33,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "bose",
    specs: { rating: "IP67", battery: "12h", bluetooth: "5.3", weight: "0.59kg" },
  },
  {
    name: "Anker 737 Power Bank (24000mAh)",
    slug: "anker-737-power-bank-24000mah",
    description:
      "A high-capacity 140W power bank with a smart display that can fast-charge a laptop, tablet, and phone.",
    price: 549,
    stock: 40,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "anker",
    specs: { capacity: "24000mAh", output: "140W", ports: 3, display: "Digital" },
  },
  {
    name: "Anker 100W GaN Charger",
    slug: "anker-100w-gan-charger",
    description:
      "A compact 100W GaN wall charger with three ports to power a laptop, tablet, and phone at once.",
    price: 229,
    stock: 60,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "anker",
    specs: { power: "100W", ports: 3, technology: "GaN" },
  },
  {
    name: "Logitech MX Master 3S Mouse",
    slug: "logitech-mx-master-3s-mouse",
    description:
      "A precision productivity mouse with quiet clicks, an 8K DPI sensor, and multi-device flow.",
    price: 429,
    stock: 38,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "logitech",
    specs: { dpi: "8000", buttons: 7, connection: "Bluetooth / USB receiver", battery: "70 days" },
  },
  {
    name: "Logitech MX Keys S Keyboard",
    slug: "logitech-mx-keys-s-keyboard",
    description:
      "A comfortable, backlit wireless keyboard with smart illumination and multi-device switching.",
    price: 499,
    stock: 29,
    featured: false,
    categorySlug: "accessories",
    brandSlug: "logitech",
    specs: { layout: "Full size", backlit: true, connection: "Bluetooth / USB receiver", battery: "10 days" },
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

  // 3. Create products, each with a small gallery of placeholder images.
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
        images: { create: galleryFor(p.name) },
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
