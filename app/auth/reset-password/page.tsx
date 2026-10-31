'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import Image from '@/components/ProxyImage'

function ResetPasswordPageContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  // This flag must be set by the recovery callback - prevents direct access by logged-in users
  const [recoveryVerified, setRecoveryVerified] = useState(false)

  const supabase = createClient()

  // Verify this is a legitimate recovery flow, not direct navigation by a logged-in user
  useEffect(() => {
    // Check if we arrived from the recovery callback with the verification flag
    const fromRecovery = searchParams.get('recovery') === 'true'
    
    if (fromRecovery) {
      setRecoveryVerified(true)
      // Clean the URL immediately - remove the recovery param so:
      // 1. Refreshing the page doesn't keep the verification alive
      // 2. Sharing the URL doesn't expose a recovery path
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [searchParams])

  // Give time for AuthProvider to detect the fresh session from the recovery flow
  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Sign out the user so they log in with their new password
    await supabase.auth.signOut()

    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/auth/login?passwordReset=true')
      router.refresh()
    }, 3000)
  }

  // Show a loading spinner while auth is still hydrating
  if (!pageReady || authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Checking your session...</p>
        </div>
      </div>
    )
  }

  // CASE 1: User navigated directly but is logged in - likely a session hijack attempt or accidental access
  if (!recoveryVerified && user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="Movime" width={48} height={48} />
              <span className="text-3xl font-bold">Movime</span>
            </Link>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              This page can only be accessed through a password reset email link. 
              If you want to change your password, please use the &ldquo;Forgot password&rdquo; option on the sign-in page.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 text-center"
            >
              Request Password Reset
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // CASE 2: User has no session and no recovery flag - invalid/expired link.
  // The success state takes priority: after a successful reset the page signs
  // the user out (user becomes null), and we must keep showing the success
  // screen during the redirect instead of flashing this error.
  if (!user && !success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.png" alt="Movime" width={48} height={48} />
              <span className="text-3xl font-bold">Movime</span>
            </Link>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Invalid or expired link</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 text-center"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // CASE 3: Legitimate recovery flow - show the reset form
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/logo.png" alt="Movime" width={48} height={48} />
            <span className="text-3xl font-bold">Movime</span>
          </Link>
          <p className="text-gray-400 mt-2">Choose a new password</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
          {success ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Password updated!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your password has been successfully reset. Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Enter your new password below. Make sure it&apos;s at least 6 characters.
              </p>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl focus:border-white focus:outline-none focus:ring-1 focus:ring-white text-white placeholder-gray-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl focus:border-white focus:outline-none focus:ring-1 focus:ring-white text-white placeholder-gray-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Every state of this page (loading, invalid session, success) is wrapped in
// one main landmark so the skip link always lands on real content.
export default function ResetPasswordPage() {
  return (
    <main id="main-content">
      <ResetPasswordPageContent />
    </main>
  )
}
