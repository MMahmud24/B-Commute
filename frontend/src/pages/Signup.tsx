import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { ApiError, type FieldErrors } from '../lib/api'
import { useAuth, type SignupPayload } from '../lib/auth'

const EMPTY: SignupPayload = {
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  password: '',
  confirm_password: '',
}

// Mirrors the backend's required-field and password-match checks for instant feedback.
// The server stays the source of truth (uniqueness, password strength).
function validate(form: SignupPayload): FieldErrors {
  const errors: FieldErrors = {}
  for (const key of Object.keys(form) as (keyof SignupPayload)[]) {
    if (!form[key].trim()) errors[key] = ['This field is required.']
  }
  if (!errors.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = ['Enter a valid email address.']
  if (!errors.password && form.password.length < 8) errors.password = ['Password must be at least 8 characters.']
  if (!errors.confirm_password && form.password !== form.confirm_password) {
    errors.confirm_password = ['Passwords do not match.']
  }
  return errors
}

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupPayload>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSubmitting(true)
    try {
      await signup(form)
      navigate('/')
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: ['Something went wrong.'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.non_field_errors?.map((msg) => (
          <p key={msg} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {msg}
          </p>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First name" name="first_name" autoComplete="given-name" value={form.first_name} onChange={onChange} errors={errors.first_name} />
          <FormField label="Last name" name="last_name" autoComplete="family-name" value={form.last_name} onChange={onChange} errors={errors.last_name} />
        </div>
        <FormField label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} errors={errors.email} />
        <FormField label="Username" name="username" autoComplete="username" value={form.username} onChange={onChange} errors={errors.username} />
        <FormField label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={onChange} errors={errors.password} />
        <FormField label="Confirm password" name="confirm_password" type="password" autoComplete="new-password" value={form.confirm_password} onChange={onChange} errors={errors.confirm_password} />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Sign up'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
