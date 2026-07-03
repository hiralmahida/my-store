import type { Metadata } from "next";
import InfoPage from "@/app/components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy — FirstStop",
  description: "How FirstStop collects, uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      subtitle="How we handle your information. Last updated: July 2026."
    >
      <p>
        FirstStop respects your privacy. This policy explains what we collect, why, and the
        choices you have. It applies to firststop.qa and our stores in Qatar.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details</strong> — your name, email and password (stored only as a secure hash).</li>
        <li><strong>Order details</strong> — items purchased, delivery address and phone number.</li>
        <li><strong>Payment</strong> — processed by our payment provider; we never store full card numbers.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To process and deliver your orders and provide support.</li>
        <li>To show your order history and keep your account secure.</li>
        <li>To improve our products and service. We don&apos;t sell your data.</li>
      </ul>
      <h2>Your choices</h2>
      <ul>
        <li>You can view and update your profile from your account page at any time.</li>
        <li>You can request deletion of your account by contacting <a href="mailto:support@firststop.qa">support@firststop.qa</a>.</li>
      </ul>
      <h2>Contact</h2>
      <p>
        Questions about your data? Email{" "}
        <a href="mailto:privacy@firststop.qa">privacy@firststop.qa</a>.
      </p>
    </InfoPage>
  );
}
