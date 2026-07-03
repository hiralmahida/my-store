import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = {
  title: "Warranty — FirstStop",
  description: "Manufacturer warranty coverage on everything we sell.",
};

export default function WarrantyPage() {
  return (
    <InfoPage title="Warranty" subtitle="Genuine products, backed by the manufacturer.">
      <p>
        Everything we sell is sourced through authorised channels, so it comes with the full{" "}
        <strong>manufacturer&apos;s warranty</strong> valid in Qatar.
      </p>
      <h2>Typical coverage</h2>
      <ul>
        <li><strong>Phones, tablets &amp; laptops:</strong> 1 year manufacturer warranty.</li>
        <li><strong>TVs &amp; home appliances:</strong> 1–2 years depending on the brand.</li>
        <li><strong>Accessories:</strong> 6–12 months.</li>
      </ul>
      <p>
        The exact warranty period is set by each manufacturer and is shown on your invoice.
      </p>
      <h2>Making a warranty claim</h2>
      <ul>
        <li>Keep your FirstStop invoice — it&apos;s your proof of purchase.</li>
        <li>Contact us at <a href="mailto:support@firststop.qa">support@firststop.qa</a> and we&apos;ll guide you to the nearest authorised service centre, or handle the claim for you.</li>
        <li>Manufacturing defects are always covered; accidental or liquid damage generally isn&apos;t.</li>
      </ul>
    </InfoPage>
  );
}
