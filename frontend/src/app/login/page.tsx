"use client"

import { supabase } from "@/utils/supabase"
import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
// using native input/label elements in this layout
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push("/")
    }

    setLoading(false)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.classList.add("loaded");
    }
  }, []);

return (
 <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden">
      {/* subtle overlay for contrast - global background provided by layout.tsx */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0" />

      {/* Floating glass orbs for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-50 animate-pulse"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px) saturate(180%)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
          }}
        ></div>
        <div
          className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full opacity-40 animate-pulse delay-1000"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px) saturate(180%)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
          }}
        ></div>
        <div
          className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full opacity-45 animate-pulse delay-500"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px) saturate(180%)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 8px 32px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
          }}
        ></div>
      </div>

      <Card
        className="max-w-md hover-lift shadow-2xl relative z-10 opacity-100 w-[126%] mx-[0] border-transparent"
        style={{
          background: "rgba(255, 255, 255, 0.25)",
          backdropFilter: "blur(40px) saturate(250%)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          boxShadow:
            "0 16px 64px rgba(0, 0, 0, 0.3), 0 16px 64px rgba(255, 255, 255, 0.2), inset 0 0px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 rgba(255, 255, 255, 0.3)",
        }}
      >
        <CardHeader className="text-center pt-3">
          <CardTitle className="text-2xl font-sans text-card-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-card-foreground/70 font-sans">
            Sign in to access the Transcription Interface
          </CardDescription>
        </CardHeader>

          <CardContent className="px-8 py-4">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                <input
                  type="email"
                  required
                  className="no-autofill w-full px-4 py-3 border border-gray-400/30 rounded-lg text-sm placeholder:text-card-foreground/50 text-card-foreground focus:outline-none bg-white/10 transition-all duration-200"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="no-autofill w-full px-4 py-3 border border-gray-400/30 rounded-lg text-sm placeholder:text-card-foreground/50 text-card-foreground focus:outline-none bg-white/10 transition-all duration-200"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50/80 border border-red-200/50 rounded-lg backdrop-blur-sm">
                  <p className="text-sm justify-center text-red-600">{error}</p>
                </div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <div className="text-sm text-gray-600">
                <a href="#" className="text-primary hover:text-primary/80 transition-colors">
                  Forgot your password?
                </a>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-300/50">
                <p className="text-sm text-gray-600">
                  Dont have an account?{" "}
                  <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
      </Card>
    </div>
  )
}
