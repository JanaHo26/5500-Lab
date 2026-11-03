import type { ReactElement } from 'react'
import { useReservations } from '../hooks/useReservations'
import styles from './UserReservations.module.css'

export interface UserReservationsProps {
  userId: string
  /** Bump this to make the list reload (e.g. after a new booking). */
  refreshKey: number
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

function UserReservations({ userId, refreshKey }: UserReservationsProps): ReactElement {
  const { reservations, resourceNames, loading, error, cancellingId, cancel } =
    useReservations(userId, refreshKey)

  return (
    <section>
      <h2>My reservations ({userId})</h2>
      {error && <p className={styles.error}>{error}</p>}
      {loading && <p>Loading reservations...</p>}
      {!loading && !error && reservations.length === 0 && (
        <p>No active reservations.</p>
      )}
      <ul className={styles.list}>
        {reservations.map((reservation) => (
          <li key={reservation.id} className={styles.item}>
            <div>
              <p className={styles.title}>
                {resourceNames[reservation.resourceId] ?? reservation.resourceId}
              </p>
              <p className={styles.meta}>
                {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
              </p>
              <p className={styles.meta}>{reservation.status}</p>
            </div>
            <button
              type="button"
              className={styles.cancel}
              disabled={cancellingId === reservation.id}
              onClick={(): void => void cancel(reservation.id)}
            >
              {cancellingId === reservation.id ? 'Cancelling...' : 'Cancel'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default UserReservations
