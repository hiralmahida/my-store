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
import { hashPassword } from "../src/lib/password";

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

// Real product photos, sourced from Wikimedia Commons (freely licensed, served
// from the stable upload.wikimedia.org CDN — hotlink-friendly). Where an exact
// model photo isn't available we reuse a real photo from the same product
// family. Any product without a mapping falls back to a generated placeholder,
// and the UI also swaps to a placeholder if an image ever fails to load.
const IMG = {
  iphone15pro: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Apple_iPhone_15_Pro.jpg/960px-Apple_iPhone_15_Pro.jpg",
  iphone14: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Back_of_the_iPhone_14_Pro.jpg/960px-Back_of_the_iPhone_14_Pro.jpg",
  galaxyS: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Samsung_Galaxy_S24_%28webtekno%29_008.png/960px-Samsung_Galaxy_S24_%28webtekno%29_008.png",
  galaxyA: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Back_of_the_Samsung_Galaxy_A54_5G.jpg/960px-Back_of_the_Samsung_Galaxy_A54_5G.jpg",
  pixel: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Google_Pixel_8_Rose_rear.jpg/960px-Google_Pixel_8_Rose_rear.jpg",
  xperia: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Sony_Xperia_1.png",
  macbookAir: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/MacBook_Air_black.jpg/960px-MacBook_Air_black.jpg",
  macbookPro: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Apple_MacBook_Pro_15%22_%282017%29.jpg/960px-Apple_MacBook_Pro_15%22_%282017%29.jpg",
  dellXps: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Dell_XPS_L401X.JPG/960px-Dell_XPS_L401X.JPG",
  laptop: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/IBM_Thinkpad_R51.jpg/960px-IBM_Thinkpad_R51.jpg",
  zenbook: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Asus_Zenbook_UX32V-8995.jpg/960px-Asus_Zenbook_UX32V-8995.jpg",
  ipad: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/IPad_Pro.jpg/960px-IPad_Pro.jpg",
  galaxyTab: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Samsung_Galaxy_Tab_7.0.jpeg/960px-Samsung_Galaxy_Tab_7.0.jpeg",
  surface: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Microsoft_Surface_Pro_4.png/960px-Microsoft_Surface_Pro_4.png",
  oledTv: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/LG%EC%A0%84%EC%9E%90%2C_%EA%B9%9C%EB%B9%A1%EC%9E%84_%EC%97%86%EB%8A%94_55%EC%9D%B8%EC%B9%98_3D_OLED_TV_%EA%B3%B5%EA%B0%9C.jpg/960px-LG%EC%A0%84%EC%9E%90%2C_%EA%B9%9C%EB%B9%A1%EC%9E%84_%EC%97%86%EB%8A%94_55%EC%9D%B8%EC%B9%98_3D_OLED_TV_%EA%B3%B5%EA%B0%9C.jpg",
  ledTv: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Techwood_flat_screen_television_from_2010.jpg/960px-Techwood_flat_screen_television_from_2010.jpg",
  sonyTv: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Sony_kdl_46x2000_bravia_display_dreambox_dm7000_receiver_by_hdtvtotal_dot_com.jpg/960px-Sony_kdl_46x2000_bravia_display_dreambox_dm7000_receiver_by_hdtvtotal_dot_com.jpg",
  washer: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Open_top-loading_washing_machine.jpg/960px-Open_top-loading_washing_machine.jpg",
  fridge: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/LG_refrigerator_interior.jpg/960px-LG_refrigerator_interior.jpg",
  vacuum: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Dyson_Cordless_Vacuum_%2843141478761%29.jpg/960px-Dyson_Cordless_Vacuum_%2843141478761%29.jpg",
  purifier: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Air_Purifier_%28Levoit_LV-H133%29_%2849318569587%29.jpg/960px-Air_Purifier_%28Levoit_LV-H133%29_%2849318569587%29.jpg",
  microwave: "https://upload.wikimedia.org/wikipedia/commons/1/12/Microwave_oven_flashon.jpg",
  airpods: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/AirPods_Pro_case.jpg/960px-AirPods_Pro_case.jpg",
  appleWatch: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Apple_Watch-.jpg/960px-Apple_Watch-.jpg",
  galaxyWatch: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/SAMSUNG_Galaxy_Watch_%282%29.jpg/960px-SAMSUNG_Galaxy_Watch_%282%29.jpg",
  headphones: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Headphones_1.jpg/960px-Headphones_1.jpg",
  speaker: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Bose_Bluetooth_Speaker.jpg/960px-Bose_Bluetooth_Speaker.jpg",
  powerbank: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Portable_power_bank.jpg/960px-Portable_power_bank.jpg",
  charger: "https://upload.wikimedia.org/wikipedia/commons/6/6a/USB_wall_charger.JPG",
  mouse: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Logitech_corded_mouse_m500_imgp1410_smial_wp.jpg/960px-Logitech_corded_mouse_m500_imgp1410_smial_wp.jpg",
  keyboard: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Rii_RT-MWK01_mini_wireless_keyboard_HS1.jpg/960px-Rii_RT-MWK01_mini_wireless_keyboard_HS1.jpg",
} as const;

// Map each product slug to its photo.
const PRODUCT_IMAGE: Record<string, string> = {
  "apple-iphone-15-pro-256gb": IMG.iphone15pro,
  "apple-iphone-15-128gb": IMG.iphone15pro,
  "apple-iphone-14-128gb": IMG.iphone14,
  "samsung-galaxy-s24-ultra-512gb": IMG.galaxyS,
  "samsung-galaxy-s24-256gb": IMG.galaxyS,
  "samsung-galaxy-a55-128gb": IMG.galaxyA,
  "google-pixel-8-pro-256gb": IMG.pixel,
  "sony-xperia-1-vi-256gb": IMG.xperia,
  "apple-macbook-air-13-m3-256gb": IMG.macbookAir,
  "apple-macbook-pro-14-m3-pro": IMG.macbookPro,
  "dell-xps-13-plus": IMG.dellXps,
  "hp-spectre-x360-14": IMG.laptop,
  "hp-pavilion-15": IMG.laptop,
  "lenovo-thinkpad-x1-carbon-gen-12": IMG.laptop,
  "lenovo-yoga-slim-7": IMG.zenbook,
  "asus-zenbook-14-oled": IMG.zenbook,
  "apple-ipad-pro-11-m4-256gb": IMG.ipad,
  "apple-ipad-air-11-m2-128gb": IMG.ipad,
  "apple-ipad-10th-gen-64gb": IMG.ipad,
  "samsung-galaxy-tab-s9-256gb": IMG.galaxyTab,
  "lenovo-tab-p12": IMG.galaxyTab,
  "microsoft-surface-pro-11": IMG.surface,
  "samsung-65-neo-qled-4k-qn90d": IMG.ledTv,
  "samsung-55-crystal-uhd-du8000": IMG.ledTv,
  "samsung-75-crystal-uhd-du7000": IMG.ledTv,
  "lg-65-oled-evo-c4": IMG.oledTv,
  "lg-55-uhd-ur8050": IMG.ledTv,
  "sony-65-bravia-7-mini-led": IMG.sonyTv,
  "sony-55-bravia-3-4k": IMG.sonyTv,
  "lg-8kg-front-load-washing-machine": IMG.washer,
  "samsung-9kg-washer-dryer-combo": IMG.washer,
  "lg-471l-french-door-refrigerator": IMG.fridge,
  "samsung-680l-side-by-side-refrigerator": IMG.fridge,
  "dyson-v15-detect-cordless-vacuum": IMG.vacuum,
  "dyson-purifier-hot-cool": IMG.purifier,
  "samsung-40l-convection-microwave-oven": IMG.microwave,
  "apple-airpods-pro-2nd-gen-usb-c": IMG.airpods,
  "apple-watch-series-10-46mm-gps": IMG.appleWatch,
  "samsung-galaxy-watch-7-44mm": IMG.galaxyWatch,
  "sony-wh-1000xm5-wireless-headphones": IMG.headphones,
  "bose-soundlink-flex-bluetooth-speaker": IMG.speaker,
  "anker-737-power-bank-24000mah": IMG.powerbank,
  "anker-100w-gan-charger": IMG.charger,
  "logitech-mx-master-3s-mouse": IMG.mouse,
  "logitech-mx-keys-s-keyboard": IMG.keyboard,
};

// One real image per product, with a generated placeholder as a safety net.
function imageFor(slug: string, name: string) {
  return [{ url: PRODUCT_IMAGE[slug] ?? placeholder(name, "", "0f172a"), alt: name }];
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
  await prisma.session.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.user.deleteMany();
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
        images: { create: imageFor(p.slug, p.name) },
      },
    });
  }

  // 4. Create demo accounts (passwords hashed with scrypt — never stored raw).
  //    These are advertised in the README for trying the app.
  const demoUsers: {
    name: string;
    email: string;
    password: string;
    role: "CUSTOMER" | "ADMIN" | "SUPERADMIN";
  }[] = [
    { name: "Store Admin", email: "admin@firststop.qa", password: "admin1234", role: "ADMIN" },
    { name: "Demo Customer", email: "customer@firststop.qa", password: "customer1234", role: "CUSTOMER" },
  ];
  for (const u of demoUsers) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: await hashPassword(u.password),
      },
    });
  }

  console.log(
    `✅  Seeded ${categories.length} categories, ${brands.length} brands, ` +
      `${products.length} products, ${demoUsers.length} demo users.`
  );
  console.log("   Demo admin:    admin@firststop.qa / admin1234");
  console.log("   Demo customer: customer@firststop.qa / customer1234");
}

main()
  .catch((error) => {
    console.error("❌  Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
