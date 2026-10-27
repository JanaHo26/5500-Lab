import { useState, type ReactElement } from 'react'
import type { Resource } from './api/campushubApi'
import BookingForm from './components/BookingForm'
import ResourceList from './components/ResourceList'
import UserReservations from './components/UserReservations'
import styles from './App.module.css'

// No login yet, so every booking belongs to this user.
const CURRENT_USER_ID = 'user-456'

function App(): ReactElement {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [refreshKey, setRefreshKey] = useState<number>(0)

  return (
    <main className={styles.app}>
      <h1>CampusHub</h1>
      <ResourceList
        selectedResourceId={selectedResource?.id ?? null}
        onSelect={setSelectedResource}
      />
      <div className={styles.columns}>
        <BookingForm
          resource={selectedResource}
          userId={CURRENT_USER_ID}
          onBooked={(): void => setRefreshKey((key) => key + 1)}
        />
        <UserReservations userId={CURRENT_USER_ID} refreshKey={refreshKey} />
      </div>
    </main>
  )
}

export default App
