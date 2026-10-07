"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Opens the browser's print dialog. The page's print styles hide everything except the result sheet. */
function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()} className="print:hidden">
      <PrinterIcon aria-hidden="true" />
      Print Result
    </Button>
  )
}

export { PrintButton }
