"use client"

import { useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

interface NotificationProps {
  message: string
  type?: "success" | "error" | "info"
  onClose: () => void
  duration?: number
}

export default function Notification({ message, type = "info", onClose, duration = 3000 }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const bgColor = type === "success" ? "bg-green-50" : type === "error" ? "bg-red-50" : "bg-blue-50"
  const borderColor = type === "success" ? "border-green-200" : type === "error" ? "border-red-200" : "border-blue-200"
  const textColor = type === "success" ? "text-green-800" : type === "error" ? "text-red-800" : "text-blue-800"
  const Icon = type === "success" ? CheckCircle : type === "error" ? AlertCircle : Info

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColor} ${borderColor} ${textColor} animate-in slide-in-from-top-2 duration-300`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
