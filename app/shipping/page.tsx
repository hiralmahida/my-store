import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = {
  title: "Shipping & Delivery — FirstStop",
  description: "Free local delivery across Qatar and our delivery timelines.",
};

export default function ShippingPage() {
  return (
    <InfoPage title="Shipping & Delivery" subtitle="Free local delivery, right across Qatar.">
      <p>
        Every order on FirstStop ships with <strong>free local delivery</strong> — there are no
        shipping fees at checkout, whatever the size of your order.
      </p>
      <h2>Delivery timelines</h2>
      <ul>
        <li><strong>Doha &amp; surrounding areas:</strong> 2–3 business days.</li>
        <li><strong>Rest of Qatar (Al Khor, Al Wakrah, Lusail, etc.):</strong> 3–4 business days.</li>
        <li><strong>Large appliances (fridges, washing machines, TVs):</strong> up to 5 business days, with a scheduled delivery window.</li>
      </ul>
      <h2>How it works</h2>
      <ul>
        <li>Orders placed before 4:00 PM (Sun–Thu) are processed the same day.</li>
        <li>You&apos;ll receive updates as your order moves from <em>Paid</em> to <em>Shipped</em> to <em>Delivered</em>.</li>
        <li>Our courier will call ahead to confirm a convenient delivery time.</li>
      </ul>
      <h2>Cash on delivery</h2>
      <p>
        Prefer to pay online? Card and Pay-in-4 instalments are available at checkout. Delivery is
        contactless where you prefer it.
      </p>
    </InfoPage>
  );
}
