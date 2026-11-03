import { useState, type FormEvent, type ReactElement } from 'react'
import type { Resource } from '../api/campushubApi'
import { useCreateReservation } from '../hooks/useReservations'
import styles from './BookingForm.module.css'

export interface BookingFormProps {
  resource: Resource | null
  userId: string
  onBooked: () => void
}

function BookingForm({ resource, userId, onBooked }: BookingFormProps): ReactElement {
  const [startTime, setStartTime] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('')
  const { submitting, error, success, submit } = useCreateReservation(userId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const booked = await submit(resource, startTime, endTime)
    if (booked) {
      setStartTime('')
      setEndTime('')
      onBooked()
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
