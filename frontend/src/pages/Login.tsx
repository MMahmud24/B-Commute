import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { ApiError, type FieldErrors } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const clientErrors: FieldErrors = {}
    if (!identifier.trim()) clientErrors.identifier = ['This field is required.']
    if (!password) clientErrors.password = ['This field is required.']
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      await login(identifier, password)
      navigate('/')
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: ['Something went wrong.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Log in">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.non_field_errors?.map((msg) => (
          <p key={msg} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {msg}
          </p>
        ))}
        <FormField label="Username or email" name="identifier" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} errors={errors.identifier} />
        <FormField label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} errors={errors.password} />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-center text-sm text-slate-600">
          New here?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
