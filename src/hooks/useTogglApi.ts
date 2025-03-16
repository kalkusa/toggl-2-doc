import { useState, useCallback } from 'react'
import { TogglTimeEntry, TogglUser, TogglProject } from '../types/toggl'
import { toaster } from '../components/ui/toaster'

const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CachedProject extends TogglProject {
  cachedAt: number;
}

interface UseTogglApiReturn {
  isLoading: boolean;
  timeEntries: TogglTimeEntry[];
  userData: TogglUser | null;
  fetchData: (apiToken: string) => Promise<void>;
}

export function useTogglApi(): UseTogglApiReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TogglTimeEntry[]>([])
  const [userData, setUserData] = useState<TogglUser | null>(null)

  const getCachedProject = useCallback((projectId: number): TogglProject | null => {
    const cached = localStorage.getItem(`project_${projectId}`)
    if (!cached) return null

    const project = JSON.parse(cached) as CachedProject
    if (Date.now() - project.cachedAt > CACHE_EXPIRY) {
      localStorage.removeItem(`project_${projectId}`)
      return null
    }

    return project
  }, [])

  const cacheProject = useCallback((project: TogglProject) => {
    const cachedProject: CachedProject = {
      ...project,
      cachedAt: Date.now()
    }
    localStorage.setItem(`project_${project.id}`, JSON.stringify(cachedProject))
  }, [])

  const fetchProject = useCallback(async (projectId: number, headers: HeadersInit, workspaceId: number) => {
    // Try to get from cache first
    const cachedProject = getCachedProject(projectId)
    if (cachedProject) {
      return cachedProject
    }

    // If not in cache, fetch from API
    const projectResponse = await fetch(`/toggl/api/v9/workspaces/${workspaceId}/projects/${projectId}`, {
      method: 'GET',
      headers
    })
    if (projectResponse.ok) {
      const project = await projectResponse.json() as TogglProject
      cacheProject(project)
      return project
    }
    return null
  }, [getCachedProject, cacheProject])

  const fetchAllTimeEntries = useCallback(async (headers: HeadersInit): Promise<TogglTimeEntry[]> => {
    let allEntries: TogglTimeEntry[] = []
    let hasMore = true
    let beforeParam: string | null = null

    while (hasMore) {
      // Build URL with before parameter if we have it
      let url = '/toggl/api/v9/me/time_entries'
      if (beforeParam) {
        url += `?before=${beforeParam}`
      }
      
      console.log(`Fetching time entries${beforeParam ? ' before ' + beforeParam : ''}...`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch time entries')
      }

      const entries = await response.json() as TogglTimeEntry[]
      allEntries = [...allEntries, ...entries]
      console.log(`Received ${entries.length} entries. Total so far: ${allEntries.length}`)

      // If we got fewer entries than the max per page, we've likely reached the end
      // But to be safe, we'll only stop if we got zero entries
      if (entries.length === 0) {
        hasMore = false
        console.log('No more entries, stopping pagination')
      } else {
        // Find the oldest entry in this batch
        // Sort entries by start date (oldest first)
        const sortedEntries = [...entries].sort((a, b) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        )
        
        const oldestEntry = sortedEntries[0]
        
        if (oldestEntry) {
          // Format date in RFC3339 format for the 'before' parameter
          // Subtract 1 second to avoid duplicates
          const oldestDate = new Date(oldestEntry.start)
          oldestDate.setSeconds(oldestDate.getSeconds() - 1)
          beforeParam = oldestDate.toISOString()
          
          // Add a small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300))
        } else {
          hasMore = false
        }
      }
    }

    console.log(`Finished fetching all entries. Total: ${allEntries.length}`)
    return allEntries
  }, [])

  const fetchData = useCallback(async (apiToken: string) => {
    if (!apiToken) {
      toaster.create({
        title: 'Error',
        description: 'Please enter your Toggl API token',
        type: 'error'
      })
      return
    }

    setIsLoading(true)
    try {
      const headers = {
        'Authorization': 'Basic ' + btoa(apiToken + ':api_token'),
        'Content-Type': 'application/json'
      }

      // First authenticate and get user data
      const userResponse = await fetch('/toggl/api/v9/me', {
        method: 'GET',
        headers
      })

      if (!userResponse.ok) {
        throw new Error('Authentication failed')
      }

      const userData = await userResponse.json() as TogglUser
      setUserData(userData)

      // Fetch all time entries with pagination
      const timeEntries = await fetchAllTimeEntries(headers)

      // Sort time entries by start date in descending order (newest first)
      timeEntries.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())

      // Fetch project details for each entry that has a project_id
      const uniqueProjectIds = [...new Set(timeEntries.filter(entry => entry.project_id).map(entry => entry.project_id!))]
      const projectsMap = new Map<number, TogglProject>()

      // Process projects in smaller batches to avoid rate limiting
      const batchSize = 5
      for (let i = 0; i < uniqueProjectIds.length; i += batchSize) {
        const batch = uniqueProjectIds.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (projectId) => {
            const project = await fetchProject(projectId, headers, userData.default_workspace_id)
            if (project) {
              projectsMap.set(projectId, project)
            }
          })
        )
        // Add a small delay between batches if there are more to process
        if (i + batchSize < uniqueProjectIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Attach project details to time entries
      const entriesWithProjects = timeEntries.map(entry => ({
        ...entry,
        project: entry.project_id ? projectsMap.get(entry.project_id) : undefined
      }))

      setTimeEntries(entriesWithProjects)

      console.log('Time entries:', entriesWithProjects.map(entry => ({
        description: entry.description,
        start: new Date(entry.start).toLocaleString(),
        stop: new Date(entry.stop).toLocaleString(),
        duration: entry.duration,
        project: entry.project?.name || 'No project'
      })))

      toaster.create({
        title: 'Success',
        description: `Connected as ${userData.fullname}. Found ${entriesWithProjects.length} time entries.`,
        type: 'success'
      })
    } catch (error) {
      console.error('Authentication error:', error)
      toaster.create({
        title: 'Error',
        description: 'Failed to authenticate with Toggl. Please check your API token.',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }, [fetchProject, fetchAllTimeEntries])

  return {
    isLoading,
    timeEntries,
    userData,
    fetchData
  }
} 