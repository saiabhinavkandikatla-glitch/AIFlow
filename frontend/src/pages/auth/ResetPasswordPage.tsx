import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { AuthShell } from '@/pages/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

export const ResetPasswordPage = () => {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await resetPassword(password)
      toast.success('Password updated')
      navigate('/app/settings')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </AuthShell>
  )
}
