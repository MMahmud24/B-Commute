import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { RESIDENCES } from '../lib/residences'

export default function Residence() {
  const { user, updateResidence } = useAuth()
  const navigate = useNavigate()
  const [residence, setResidence] = useState(user?.residence ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!residence) {
      setError('Choose where you live.')
      return
    }
    setSubmitting(true)
    try {
      await updateResidence(residence)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.residence?.[0] ?? 'Could not save. Try again.') : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Where do you live?">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">We use this to plan your bus rides. You can change it later.</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Residential community</legend>
          {RESIDENCES.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${
                residence === r.value ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'
              }`}
            >
              <input type="radio" name="residence" value={r.value} checked={residence === r.value} onChange={() => { setResidence(r.value); setError('') }} />
              <span className="text-slate-900">{r.label}</span>
            </label>
          ))}
        </fieldset>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </AuthLayout>
  )
}
