// Contact form server action. Validates the message and acknowledges it. In a
// real deployment this would email the support inbox or store a ticket; here it
// simply confirms receipt (no message is persisted or sent).

"use server";

export interface ContactState {
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (message.length < 10) fieldErrors.message = "Please enter a message (at least 10 characters).";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return { success: true };
}
