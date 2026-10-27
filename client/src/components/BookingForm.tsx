import { useState, type FormEvent, type ReactElement } from 'react'
import {
  createReservation,
  getApiErrorMessage,
  type Resource,
} from '../api/campushubApi'
import styles from './BookingForm.module.css'

export interface BookingFormProps {
  resource: Resource | null
  userId: string
  onBooked: () => void
}

function validate(resource: Resource | null, start: string, end: string): string | null {
  if (!resource) return 'Select a resource first.'
  if (!start || !end) return 'Enter both a start time and an end time.'
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    return 'End time must be after start time.'
  }
  return null
}

function BookingForm({ resource, userId, onBooked }: BookingFormProps): ReactElement {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSuccess(null)

    const validationError = validate(resource, startTime, endTime)
    if (validationError || !resource) {
      setError(validationError)
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await createReservation({
        resourceId: resource.id,
        userId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      })
      setSuccess(`Booked ${resource.name}.`)
      setStartTime('')
      setEndTime('')
      onBooked()
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h2>Book a resource</h2>
      <form className={styles.form} onSubmit={(e): void => void handleSubmit(e)}>
        <p className={styles.selected}>
          {resource
            ? `Selected: ${resource.name} (${resource.location})`
            : 'No resource selected. Click "Book" on a card.'}
        </p>
        <label className={styles.field}>
          Start time
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e): void => setStartTime(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          End time
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e): void => setEndTime(e.target.value)}
          />
        </label>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Booking...' : 'Confirm booking'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
      </form>
    </section>
  )
}

export default BookingForm
