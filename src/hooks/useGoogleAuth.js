import { useState, useEffect, useCallback } from 'react'

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive.file'
].join(' ')

// You'll need to replace this with your own client ID from Google Cloud Console
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export function useGoogleAuth() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tokenClient, setTokenClient] = useState(null)

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initializeGoogleAuth
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const initializeGoogleAuth = useCallback(() => {
    if (!CLIENT_ID) {
      console.warn('Google Client ID not configured')
      setIsLoading(false)
      return
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token)
            setIsSignedIn(true)
            // Get user info
            fetchUserInfo(response.access_token)
          }
        },
      })
      setTokenClient(client)
      setIsLoading(false)
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error)
      setIsLoading(false)
    }
  }, [])

  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    }
  }

  const signIn = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken()
    }
  }, [tokenClient])

  const signOut = useCallback(() => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null)
        setIsSignedIn(false)
        setUser(null)
      })
    }
  }, [accessToken])

  return {
    isSignedIn,
    isLoading,
    accessToken,
    user,
    signIn,
    signOut,
    isConfigured: !!CLIENT_ID
  }
}
