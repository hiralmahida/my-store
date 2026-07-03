import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = {
  title: "About — FirstStop",
  description: "FirstStop is Qatar's destination for the latest electronics.",
};

export default function AboutPage() {
  return (
    <InfoPage title="About FirstStop" subtitle="Qatar's destination for the latest electronics.">
      <p>
        FirstStop started with a simple idea: buying electronics in Qatar should be easy,
        transparent, and fair. From smartphones and laptops to TVs, home appliances and
        accessories, we bring the brands people trust together in one place — with prices
        clearly shown in Qatari Riyal and no surprises at checkout.
      </p>
      <h2>What we stand for</h2>
      <ul>
        <li>
          <strong>Genuine products only.</strong> Every item is sourced through authorised
          channels and carries the manufacturer&apos;s warranty.
        </li>
        <li>
          <strong>Free local delivery.</strong> We deliver across Qatar at no extra cost,
          usually within 2–4 business days.
        </li>
        <li>
          <strong>Flexible payment.</strong> Pay by card or split your purchase into four
          interest-free instalments with our Pay-in-4 option.
        </li>
        <li>
          <strong>Real support.</strong> A local team you can reach by phone or email when you
          need help before or after your purchase.
        </li>
      </ul>
      <h2>Based in Doha, serving all of Qatar</h2>
      <p>
        Our team is based in Doha, close to the customers we serve. Whether you&apos;re setting
        up a new home, upgrading your phone, or kitting out an office, FirstStop aims to be the
        first — and last — stop you need.
      </p>
    </InfoPage>
  );
}
