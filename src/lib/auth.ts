import { PublicClientApplication, type Configuration, type AccountInfo } from '@azure/msal-browser'

const msalConfig: Configuration = {
  auth: {
    clientId:    '36aa1fcc-c93f-4637-8bd1-14b92e79a5fb',
    authority:   'https://login.microsoftonline.com/982ea7d9-d08d-49b3-a11e-2344474c6ae4',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
  },
  cache: { cacheLocation: 'sessionStorage' },
}

let _msal: PublicClientApplication | null = null

export function getMsal() {
  if (!_msal) _msal = new PublicClientApplication(msalConfig)
  return _msal
}

export async function loginRedirect() {
  const msal = getMsal()
  await msal.initialize()
  await msal.loginRedirect({ scopes: ['openid', 'profile', 'email'] })
}

export async function logoutRedirect() {
  const msal = getMsal()
  await msal.initialize()
  await msal.logoutRedirect()
}

export async function getAccount(): Promise<AccountInfo | null> {
  const msal = getMsal()
  await msal.initialize()
  await msal.handleRedirectPromise()
  return msal.getAllAccounts()[0] ?? null
}

export async function getAccessToken(): Promise<string | null> {
  const msal = getMsal()
  await msal.initialize()
  const accounts = msal.getAllAccounts()
  if (!accounts.length) return null
  try {
    const result = await msal.acquireTokenSilent({
      scopes: ['openid', 'profile', 'email'],
      account: accounts[0],
    })
    return result.accessToken
  } catch {
    return null
  }
}
