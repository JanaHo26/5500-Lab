import { useEffect, useState, type ReactElement } from 'react'
import {
  cancelReservation,
  fetchResources,
  fetchUserReservations,
  getApiErrorMessage,
  type Reservation,
  type Resource,
} from '../api/campushubApi'
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
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [resourceNames, setResourceNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState<number>(0)

  useEffect(() => {
    let ignore = false

    async function load(): Promise<void> {
      setLoading(true)
      try {
        // Unfiltered resource list, so names resolve whatever filter ResourceList has.
        // If it fails we still show reservations, falling back to the id.
        const [data, resources] = await Promise.all([
          fetchUserReservations(userId),
          fetchResources().catch((): Resource[] => []),
        ])
        if (!ignore) {
          setReservations(data)
          setResourceNames(
            Object.fromEntries(resources.map((r) => [r.id, r.name])),
          )
          setError(null)
        }
      } catch (err: unknown) {
        if (!ignore) setError(getApiErrorMessage(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void load()
    return (): void => {
      ignore = true
    }
  }, [userId, refreshKey, reloadCount])

  async function handleCancel(reservationId: string): Promise<void> {
    setCancellingId(reservationId)
    try {
      await cancelReservation(reservationId)
      setReloadCount((count) => count + 1)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    } finally {
      setCancellingId(null)
    }
  }

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
              onClick={(): void => void handleCancel(reservation.id)}
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
