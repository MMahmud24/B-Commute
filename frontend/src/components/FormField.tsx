import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  errors?: string[]
}

export default function FormField({ label, errors, id, ...inputProps }: Props) {
  const inputId = id ?? inputProps.name
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={errors?.length ? true : undefined}
        className={`rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 ${
          errors?.length ? 'border-red-500' : 'border-slate-300'
        }`}
        {...inputProps}
      />
      {errors?.map((msg) => (
        <p key={msg} className="text-sm text-red-600">
          {msg}
        </p>
      ))}
    </div>
  )
}
