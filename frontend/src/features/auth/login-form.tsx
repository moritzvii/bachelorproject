import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FormEvent,
} from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"


import { useAuth } from "@/features/auth/auth-context"

type LoginFormProps = ComponentPropsWithoutRef<"form">

const CODE_LENGTH = 10

export function LoginForm({ className, ...props }: LoginFormProps) {
  const navigate = useNavigate()
  const location = useLocation() as any

  const otpRef = useRef<ElementRef<typeof InputOTP>>(null)

  const [code, setCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  
  const { login } = useAuth()

  useEffect(() => {
    otpRef.current?.focus()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (code.length !== CODE_LENGTH) {
      toast.error(`Bitte den ${CODE_LENGTH}-stelligen Zugangscode eingeben.`)
      return
    }

    setIsSubmitting(true)

    const ok = await login(code)

    if (!ok) {
      toast.error("Invalid access code.")
      setIsSubmitting(false)
      return
    }

    toast.success("Access granted. Redirecting…")

    const redirectTo = location.state?.from?.pathname || "/"
    navigate(redirectTo, { replace: true })

    setIsSubmitting(false)
  }

  return (
      <form
          className={cn("flex flex-col gap-6", className)}
          onSubmit={handleSubmit}
          {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Enter your access code</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Enter the 10-digit evaluation access code.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col items-center gap-3 text-center text-sm font-medium text-muted-foreground">
            Access code
            <InputOTP
                ref={otpRef}
                value={code}
                onChange={(v) => setCode(v)}
                maxLength={CODE_LENGTH}
                inputMode="text"
                containerClassName="justify-center"
                autoComplete="one-time-code"
                autoFocus
            >
              <InputOTPGroup onClick={() => otpRef.current?.focus()}>
                {Array.from({ length: CODE_LENGTH }).map((_, idx) => (
                    <InputOTPSlot key={idx} index={idx} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </label>

          <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || code.length !== CODE_LENGTH}
          >
            {isSubmitting ? "Checking…" : "Unlock workspace"}
          </Button>
        </div>
      </form>
  )
}
