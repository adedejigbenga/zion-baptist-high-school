"use client"

import * as React from "react"
import { CheckCircle2Icon, InfoIcon, SendIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormError, FormHint } from "@/components/ui/form-message"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { submitEnquiryAction, type EnquiryState } from "@/lib/services/enquiry-actions"
import { ENQUIRY_TOPICS } from "@/lib/validation/enquiry"

const initial: EnquiryState = { status: "idle" }

/**
 * Contact form. The server validates everything (and works without JavaScript); the browser only keeps what you typed
 * when something needs fixing and moves focus to the first problem.
 */
function ContactForm({ defaultTopic }: { defaultTopic: string }) {
  const [state, action, pending] = React.useActionState(submitEnquiryAction, initial)
  const errors = state.fieldErrors ?? {}
  const values = state.values ?? {}
  const formRef = React.useRef<HTMLFormElement>(null)
  const successRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
    if (state.status === "success") successRef.current?.focus()
  }, [state])

  if (state.status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} className="outline-none" data-testid="enquiry-success">
        <Alert variant="success" role="status">
          <CheckCircle2Icon aria-hidden="true" />
          <AlertTitle>Thank you for getting in touch</AlertTitle>
          <AlertDescription>
            <p>Your message passed our checks.</p>
            {state.demo && (
              <p className="mt-2 flex items-start gap-2">
                <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Demo notice: this website is not yet connected to the school&apos;s email, so the message was not sent. Please call or email the
                  school directly using the details on this page.
                </span>
              </p>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const describe = (name: string, hint?: string) => (errors[name as keyof typeof errors] ? `${name}-error` : hint)

  return (
    <form ref={formRef} action={action} noValidate className="stack-form" aria-label="Contact form">
      {state.status === "error" && state.message && (
        <Alert variant="destructive" data-testid="enquiry-error">
          <AlertTitle>{state.message}</AlertTitle>
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="stack-field">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" required defaultValue={values.name ?? ""} aria-invalid={errors.name ? true : undefined} aria-describedby={describe("name")} />
          <FormError id="name-error">{errors.name}</FormError>
        </div>
        <div className="stack-field">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={values.email ?? ""} aria-invalid={errors.email ? true : undefined} aria-describedby={describe("email")} />
          <FormError id="email-error">{errors.email}</FormError>
        </div>
        <div className="stack-field">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={values.phone ?? ""} aria-invalid={errors.phone ? true : undefined} aria-describedby={describe("phone")} />
          <FormError id="phone-error">{errors.phone}</FormError>
        </div>
        <div className="stack-field">
          <Label htmlFor="topic">Topic</Label>
          <NativeSelect id="topic" name="topic" defaultValue={values.topic || defaultTopic} aria-invalid={errors.topic ? true : undefined} aria-describedby={describe("topic")}>
            {ENQUIRY_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
          <FormError id="topic-error">{errors.topic}</FormError>
        </div>
      </div>

      <div className="stack-field">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={6} required minLength={10} maxLength={2000} defaultValue={values.message ?? ""} aria-invalid={errors.message ? true : undefined} aria-describedby={describe("message", "message-hint")} />
        <FormHint id="message-hint">At least 10 characters.</FormHint>
        <FormError id="message-error">{errors.message}</FormError>
      </div>

      {/* Honeypot for bots: hidden from people and assistive technology, never focusable. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Button type="submit" size="lg" loading={pending} className="self-start">
        <SendIcon aria-hidden="true" />
        Send Message
      </Button>
    </form>
  )
}

export { ContactForm }
