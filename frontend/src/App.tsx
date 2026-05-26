import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { DashboardPage } from '@/pages/app/DashboardPage'
import { NewThreadPage } from '@/pages/app/NewThreadPage'
import { OnboardingPage } from '@/pages/app/OnboardingPage'
import { SettingsPage } from '@/pages/app/SettingsPage'
import { ThreadDetailPage } from '@/pages/app/ThreadDetailPage'
import { ThreadsPage } from '@/pages/app/ThreadsPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { LandingPage } from '@/pages/LandingPage'
import { PricingPage } from '@/pages/PricingPage'

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/app/onboarding" element={<OnboardingPage />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="threads" element={<ThreadsPage />} />
        <Route path="threads/new" element={<NewThreadPage />} />
        <Route path="threads/:id" element={<ThreadDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
