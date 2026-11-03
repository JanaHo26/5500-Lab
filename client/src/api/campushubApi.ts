import axios, { type AxiosInstance } from 'axios'

// Single source of truth for these types lives in the backend's src/types/.
import type { ErrorResponse } from '../../../src/types/common'
import type {
  Reservation,
  ReservationInput,
  ReservationStatus,
} from '../../../src/types/reservation'
import type { Resource, ResourceType } from '../../../src/types/resource'

export type {
  ErrorResponse,
  Reservation,
  ReservationInput,
  ReservationStatus,
  Resource,
  ResourceType,
}

// Relative base URL: in dev the Vite proxy forwards /api to localhost:3000.
const api: AxiosInstance = axios.create({ baseURL: '/api/v1' })

/** Pulls the API's ErrorResponse message out of a failed request, so components don't touch axios. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export async function fetchResources(type?: ResourceType): Promise<Resource[]> {
  const response = await api.get<Resource[]>('/resources', {
    params: type ? { type } : undefined,
  })
  return response.data
}

export async function createReservation(
  payload: ReservationInput,
): Promise<Reservation> {
  const response = await api.post<Reservation>('/reservations', payload)
  return response.data
}

export async function fetchUserReservations(
  userId: string,
): Promise<Reservation[]> {
  const response = await api.get<Reservation[]>(
    `/reservations/user/${encodeURIComponent(userId)}`,
  )
  return response.data
}

export async function cancelReservation(
  reservationId: string,
): Promise<Reservation> {
  const response = await api.patch<Reservation>(
    `/reservations/${encodeURIComponent(reservationId)}/cancel`,
  )
  return response.data
}
