import type { EnquiryInput } from "@/lib/validation/enquiry"

/**
 * PLACEHOLDER delivery of a contact-form enquiry.
 *
 * Nothing is connected yet: no email provider and no enquiry table exist, and the enquiry text is deliberately NOT written
 * to the logs (it contains personal details). To go live, send the message here (e.g. through an email API) or store it,
 * then set `enquiryDeliveryConnected: true` in src/lib/site-config.ts so the form stops saying delivery is not connected.
 */
export async function deliverEnquiry(enquiry: EnquiryInput): Promise<{ delivered: boolean }> {
  void enquiry
  return { delivered: false }
}
