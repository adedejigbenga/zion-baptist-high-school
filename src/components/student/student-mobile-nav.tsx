"use client"

import * as React from "react"
import { MenuIcon } from "lucide-react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { StudentNav } from "@/components/student/student-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

/**
 * Menu for screens below lg. `children` is the student profile block, rendered on the server and passed in,
 * so no data fetching happens in this client component.
 */
function StudentMobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}>
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(20rem,88vw)] gap-0 p-0 sm:max-w-xs">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="sr-only">Student portal menu</SheetTitle>
          <SheetDescription className="sr-only">Navigate the student portal or log out</SheetDescription>
          <BrandLogo asLink={false} />
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
          {children}
          <StudentNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { StudentMobileNav }
