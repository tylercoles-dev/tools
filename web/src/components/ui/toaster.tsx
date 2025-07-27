"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToasts } from "@/hooks/use-toast"

export function Toaster() {
  const toasts = useToasts()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, variant, ...props }) {
        // Map our variants to toast component variants
        const toastVariant = variant === 'destructive' ? 'destructive' : 'default'
        
        return (
          <Toast key={id} variant={toastVariant} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}