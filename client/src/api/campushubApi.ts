import axios, { type AxiosInstance } from 'axios'

export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'LAB'

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface Resource {
  id: string
  name: string
  type: ResourceType
  location: string
  isAvailable: boolean
}

export interface CreateReservationDTO {
  resourceId: string
  userId: string
  /** ISO 8601 date-time string. */
  startTime: string
  /** ISO 8601 date-time string. */
  endTime: string
}

export interface Reservation {
  id: string
  resourceId: string
  userId: string
  startTime: string
  endTime: string
  status: ReservationStatus
}

export interface ErrorResponse {
  code: string
  message: string
}

// Relative base URL: in dev the Vite proxy forwards /api to localhost:3000.
const api: AxiosInstance = axios.create({ baseURL: '/api/v1' })

export async function fetchResources(type?: ResourceType): Promise<Resource[]> {
  const response = await api.get<Resource[]>('/resources', {
    params: type ? { type } : undefined,
  })
  return response.data
}

export async function createReservation(
  payload: CreateReservationDTO,
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
