import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = {
  title: "Returns — FirstStop",
  description: "Our 14-day return window and how to return an item.",
};

export default function ReturnsPage() {
  return (
    <InfoPage title="Returns" subtitle="Changed your mind? Returns are simple.">
      <p>
        If something isn&apos;t right, you can return most items within{" "}
        <strong>14 days of delivery</strong> for a full refund or exchange.
      </p>
      <h2>What can be returned</h2>
      <ul>
        <li>Items in their original, unopened or gently-opened condition with all accessories and packaging.</li>
        <li>Products that are faulty on arrival — these are always covered (see also our Warranty page).</li>
      </ul>
      <h2>What can&apos;t be returned</h2>
      <ul>
        <li>Items with signs of physical damage or misuse.</li>
        <li>For hygiene reasons, in-ear headphones and personal-care items once the seal is broken.</li>
        <li>Software, digital codes, and gift cards.</li>
      </ul>
      <h2>How to start a return</h2>
      <ul>
        <li>Contact us at <a href="mailto:support@firststop.qa">support@firststop.qa</a> or +974 4400 0000 with your order number.</li>
        <li>We&apos;ll arrange a free pickup anywhere in Qatar.</li>
        <li>Refunds are issued to your original payment method within 5–7 business days of us receiving the item.</li>
      </ul>
    </InfoPage>
  );
}
