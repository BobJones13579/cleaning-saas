"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAuth } from "@/components/AuthProvider"

function validateEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email)
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState<string | null>(null)
  const { session } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (session) {
      setIsRedirecting(true);
      router.replace("/dashboard");
    }
  }, [session, router]);

  if (isRedirecting) {
    return <div className="text-center py-16 text-lg text-gray-400">Redirecting...</div>;
  }

  // Handle login form submission
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (!password) {
      setError("Password is required.")
      return
    }
    setLoading(true)
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message)
        toast({ title: "Login failed", description: loginError.message, variant: "destructive" })
      } else {
        toast({ title: "Login successful!", description: "Redirecting to dashboard..." })
        router.replace("/dashboard")
      }
    } catch (err: any) {
      setError("Unexpected error. Please try again.")
      toast({ title: "Unexpected error", description: err.message || String(err), variant: "destructive" })
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setForgotMessage(null)
    if (!validateEmail(forgotEmail)) {
      setForgotMessage("Please enter a valid email address.")
      return
    }
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + "/login"
    })
    setForgotLoading(false)
    if (error) {
      setForgotMessage(error.message)
    } else {
      setForgotMessage("Password reset email sent. Please check your inbox.")
    }
  }

  // Login page UI
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded bg-white p-8 shadow-md flex flex-col items-center"
      >
        {/* App name/logo */}
        <h1 className="mb-8 text-3xl font-bold text-blue-700">CleanOps Admin</h1>
        <div className="w-full mb-4">
          <label htmlFor="email" className="block mb-2 text-sm font-medium">Email</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="w-full mb-2">
          <label htmlFor="password" className="block mb-2 text-sm font-medium">Password</label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
          />
        </div>
        {error && <div className="text-sm text-red-600 mt-1">{error}</div>}
        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
        <div className="flex justify-between w-full mt-4 text-sm">
          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogTrigger asChild>
              <button type="button" className="text-blue-600 hover:underline">Forgot password?</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <label htmlFor="forgot-email" className="block mb-2 text-sm font-medium">Email</label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
                {forgotMessage && <div className="text-sm text-red-600 mt-1">{forgotMessage}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={forgotLoading}>
                    {forgotLoading ? "Sending..." : "Send Reset Email"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Link href="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </div>
      </form>
    </div>
  )
} 