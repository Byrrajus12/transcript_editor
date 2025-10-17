'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? '/home' : '/login')
    }
    checkSession()
  }, [router])

  return null // Nothing to show while redirecting
}