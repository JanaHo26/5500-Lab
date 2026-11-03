import { useEffect, useState } from 'react'
import {
  cancelReservation,
  createReservation,
  fetchResources,
  fetchUserReservations,
  getApiErrorMessage,
  type Reservation,
  type Resource,
} from '../api/campushubApi'

export interface UseReservationsResult {
  reservations: Reservation[]
  /** Resource id -> display name. Missing ids fall back to the id in the UI. */
  resourceNames: Record<string, string>
  loading: boolean
  error: string | null
  cancellingId: string | null
  cancel: (reservationId: string) => Promise<void>
}

/**
 * Loads a user's active reservations (plus resource names) and exposes cancel.
 * Reloads when userId or refreshKey changes, and after a successful cancel.
 */
export function useReservations(
  userId: string,
  refreshKey: number,
): UseReservationsResult {
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

  async function cancel(reservationId: string): Promise<void> {
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

  return { reservations, resourceNames, loading, error, cancellingId, cancel }
}

function validate(resource: Resource | null, start: string, end: string): string | null {
  if (!resource) return 'Select a resource first.'
  if (!start || !end) return 'Enter both a start time and an end time.'
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    return 'End time must be after start time.'
  }
  return null
}

export interface UseCreateReservationResult {
  submitting: boolean
  error: string | null
  success: string | null
  /** Validates and books. Resolves true only if the reservation was created. */
  submit: (resource: Resource | null, startTime: string, endTime: string) => Promise<boolean>
}

/** Validation, submit state and the create call for the booking form. */
export function useCreateReservation(userId: string): UseCreateReservationResult {
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(
    resource: Resource | null,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    setSuccess(null)

    const validationError = validate(resource, startTime, endTime)
    if (validationError || !resource) {
      setError(validationError)
      return false
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
      return true
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, error, success, submit }
}
