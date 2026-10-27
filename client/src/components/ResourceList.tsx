import { useEffect, useState, type ReactElement } from 'react'
import {
  fetchResources,
  getApiErrorMessage,
  type Resource,
  type ResourceType,
} from '../api/campushubApi'
import styles from './ResourceList.module.css'

type ResourceFilter = 'ALL' | ResourceType

const FILTERS: ResourceFilter[] = ['ALL', 'ROOM', 'EQUIPMENT', 'LAB']

export interface ResourceListProps {
  selectedResourceId: string | null
  onSelect: (resource: Resource) => void
}

function ResourceList({
  selectedResourceId,
  onSelect,
}: ResourceListProps): ReactElement {
  const [filter, setFilter] = useState<ResourceFilter>('ALL')
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchResources(filter === 'ALL' ? undefined : filter)
        if (!ignore) setResources(data)
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
  }, [filter])

  return (
    <section>
      <h2>Resources</h2>
      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === filter ? styles.filterActive : styles.filter}
            onClick={(): void => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p>Loading resources...</p>}
      {!loading && !error && resources.length === 0 && (
        <p>No resources found.</p>
      )}

      <ul className={styles.grid}>
        {resources.map((resource) => (
          <li
            key={resource.id}
            className={
              resource.id === selectedResourceId ? styles.cardSelected : styles.card
            }
          >
            <h3>{resource.name}</h3>
            <p className={styles.meta}>{resource.type}</p>
            <p className={styles.meta}>{resource.location}</p>
            <p className={resource.isAvailable ? styles.available : styles.unavailable}>
              {resource.isAvailable ? 'Available' : 'Unavailable'}
            </p>
            <button
              type="button"
              className={styles.book}
              disabled={!resource.isAvailable}
              onClick={(): void => onSelect(resource)}
            >
              {resource.id === selectedResourceId ? 'Selected' : 'Book'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ResourceList
