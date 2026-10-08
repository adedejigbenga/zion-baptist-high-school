"use server"

import { deliverEnquiry } from "@/lib/services/enquiry"
import { siteConfig } from "@/lib/site-config"
import { parseEnquiryForm, type EnquiryField } from "@/lib/validation/enquiry"

export type EnquiryState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Partial<Record<EnquiryField, string>>
  /** Echoed back on error so the visitor does not have to retype. */
  values?: Record<string, string>
  /** True when the message was only validated, not delivered anywhere (see services/enquiry.ts). */
  demo?: boolean
}

/**
 * Public Server Action behind the contact form (public endpoint: nothing is trusted). It validates every field, ignores
 * bots that fill the hidden "website" field, and hands valid messages to deliverEnquiry().
 */
export async function submitEnquiryAction(_previous: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const values: Record<string, string> = {}
  for (const name of ["name", "email", "phone", "topic", "message"]) {
    const v = formData.get(name)
    values[name] = typeof v === "string" ? v.slice(0, 2100) : ""
  }

  // Honeypot: real visitors never see this field. Pretend success so bots learn nothing.
  const trap = formData.get("website")
  if (typeof trap === "string" && trap.trim() !== "") return { status: "success", demo: !siteConfig.enquiryDeliveryConnected }

  const parsed = parseEnquiryForm(formData)
  if (!parsed.ok) return { status: "error", message: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors, values }

  const result = await deliverEnquiry(parsed.input)
  if (siteConfig.enquiryDeliveryConnected && !result.delivered) {
    return { status: "error", message: "Sorry, we could not send your message. Please try again or call the school.", values }
  }
  return { status: "success", demo: !siteConfig.enquiryDeliveryConnected }
}
