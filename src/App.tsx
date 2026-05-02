import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppToaster } from '@/components/ui/toast'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { LogsProvider } from '@/context/LogsContext'
import { Layout } from '@/components/layout/Layout'
import { Login } from '@/pages/Login'
import { Listings } from '@/pages/Listings'
import { AddListing } from '@/pages/AddListing'
import { Users } from '@/pages/Users'
import { Logs } from '@/pages/Logs'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <SidebarProvider>
      <AuthProvider>
        <AppProvider>
          <LogsProvider>
            <AppToaster />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/"         element={<Navigate to="/listings" replace />} />
                    <Route path="/listings"    element={<Listings />} />
                    <Route path="/add-listing" element={<AddListing />} />
                    <Route path="/users"       element={<Users />} />
                    <Route path="/logs"        element={<Logs />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </LogsProvider>
        </AppProvider>
      </AuthProvider>
      </SidebarProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
