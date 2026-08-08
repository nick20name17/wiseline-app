import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { usePage } from '@/session/use-page'

import { departmentsFor, isScoped, viewerStore, type Department, type Role } from '@/session/viewer'

import '@/styles/login.css'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: () => {
    if (viewerStore.get())
      throw redirect({ to: landingFor(viewerStore.get()!.role, viewerStore.get()!.department) })
  },
  component: SignIn
})

const ROLES: { role: Role; label: string }[] = [
  { role: 'manager', label: 'Manager' },
  { role: 'admin', label: 'Admin' },
  { role: 'worker', label: 'Worker' },
  { role: 'shipping', label: 'Shipping Manager' },
  { role: 'driver', label: 'Driver' }
]

const DEPARTMENT_LABELS: Record<Department, string> = {
  all: 'All',
  trim: 'Trim',
  rollforming: 'Rollforming',
  accessories: 'Accessories',
  shipping: 'Shipping'
}

/** Where each role starts, and the department override — both straight from the prototype. */
const LANDING: Record<Role, string> = {
  admin: '/dashboard',
  manager: '/dashboard',
  worker: '/trim',
  shipping: '/shipping',
  driver: '/driver'
}

const DEPARTMENT_LANDING: Record<Exclude<Department, 'all'>, string> = {
  trim: '/trim',
  rollforming: '/rollforming',
  accessories: '/accessories',
  shipping: '/shipping'
}

const landingFor = (role: Role, department: Department) =>
  isScoped(role) && department !== 'all' ? DEPARTMENT_LANDING[department] : LANDING[role]

function SignIn() {
  usePage('login')

  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('admin')
  const [department, setDepartment] = useState<Department>('all')

  const departments = departmentsFor(role)

  const pickRole = (next: Role) => {
    setRole(next)
    if (!departments.includes(department)) setDepartment('all')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    viewerStore.set({ role, department })
    void navigate({ to: landingFor(role, department) })
  }

  return (
    <div className='login-page' data-comment='login-page'>
      <div className='login-card' data-comment='login-card'>
        <div className='login-brand' data-comment='login-brand'>
          <div className='brand-mark' data-comment='login-brand-mark'>
            <span />
          </div>
          <div data-comment='login-brand-text'>
            <div className='login-brand-name' data-comment='login-brand-name'>
              Wiseline
            </div>
            <div className='login-brand-sub' data-comment='login-brand-sub'>
              Production
            </div>
          </div>
        </div>
        <h1 className='login-heading' data-comment='login-heading'>
          Sign in
        </h1>
        <p className='login-subheading' data-comment='login-subheading'>
          Access the production floor dashboard
        </p>
        <form data-comment='login-form' onSubmit={submit}>
          <div className='field' data-comment='login-email-field'>
            <label className='field-label' htmlFor='login-email' data-comment='login-email-label'>
              Email
            </label>
            <div className='input-wrap' data-comment='login-email-wrap'>
              <Mail className='input-ico' data-comment='login-email-icon' />
              <input
                className='field-input'
                type='email'
                id='login-email'
                data-comment='login-email-input'
                placeholder='you@wiseline.com'
              />
            </div>
          </div>
          <div className='field' data-comment='login-password-field'>
            <label
              className='field-label'
              htmlFor='login-password'
              data-comment='login-password-label'
            >
              Password
            </label>
            <div className='input-wrap' data-comment='login-password-wrap'>
              <Lock className='input-ico' data-comment='login-password-icon' />
              <input
                className='field-input'
                type='password'
                id='login-password'
                data-comment='login-password-input'
                placeholder='••••••••'
              />
            </div>
          </div>
          <button
            type='submit'
            className='btn btn-primary login-submit'
            data-comment='login-continue-btn'
          >
            Continue
            <ArrowRight />
          </button>
        </form>
        <p className='login-hint' data-comment='login-hint'>
          Any credentials work
        </p>
        <div className='login-roles' data-comment='login-roles'>
          <span className='login-roles-label' data-comment='login-roles-label'>
            Sign in as
          </span>
          {ROLES.map(option => (
            <span
              key={option.role}
              className={option.role === role ? 'chip chip-active' : 'chip'}
              role='button'
              tabIndex={0}
              data-comment={`login-role-${option.role}`}
              onClick={() => pickRole(option.role)}
            >
              {option.label}
            </span>
          ))}
        </div>
        {isScoped(role) ? (
          <div className='login-roles' data-comment='login-depts' id='login-depts'>
            <span className='login-roles-label' data-comment='login-depts-label'>
              Department
            </span>
            {departments.map(option => (
              <span
                key={option}
                className={option === department ? 'chip chip-active' : 'chip'}
                role='button'
                tabIndex={0}
                data-comment={`login-dept-${option}`}
                onClick={() => setDepartment(option)}
              >
                {DEPARTMENT_LABELS[option]}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
