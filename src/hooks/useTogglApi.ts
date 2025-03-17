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
    
    // Create a mutable copy of headers that we can add workspace ID to
    let headersWithWorkspace = { ...headers } as Record<string, string>
    
    // Fetch the user data first to get workspace ID if not already available
    if (!headersWithWorkspace['X-Workspace-Id']) {
      try {
        const userResponse = await fetch('/toggl/api/v9/me', { 
          method: 'GET',
          headers 
        })
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data')
        }
        
        const userData = await userResponse.json() as TogglUser
        headersWithWorkspace = {
          ...headersWithWorkspace,
          'X-Workspace-Id': userData.default_workspace_id.toString()
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        throw new Error('Failed to get workspace ID')
      }
    }
    
    // Get workspace ID from headers
    const workspaceId = headersWithWorkspace['X-Workspace-Id']
    
    if (!workspaceId) {
      throw new Error('Workspace ID not available')
    }
    
    // The Reports API has a maximum date range of 366 days
    // We need to split our requests into yearly chunks
    
    // Start with the current year
    const today = new Date()
    let endDate = new Date(today)
    
    // Keep going back in time until we don't get any more entries
    let hasMoreYears = true
    
    while (hasMoreYears) {
      // Set current chunk's end date
      const endDateStr = endDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
      
      // Set start date to exactly 365 days before end date
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - 365)
      const startDateStr = startDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
      
      console.log(`Fetching time entries from ${startDateStr} to ${endDateStr}...`)
      
      // For each yearly chunk, we need to handle pagination
      const entriesForYearChunk = await fetchTimeEntriesForDateRange(
        startDateStr, 
        endDateStr, 
        workspaceId, 
        headersWithWorkspace
      )
      
      if (entriesForYearChunk.length > 0) {
        console.log(`Found ${entriesForYearChunk.length} entries for the period ${startDateStr} to ${endDateStr}`)
        allEntries = [...allEntries, ...entriesForYearChunk]
        
        // Move back in time for the next chunk
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() - 1)
      } else {
        // If we didn't get any entries for this chunk, we can stop going back in time
        hasMoreYears = false
        console.log(`No entries found for the period ${startDateStr} to ${endDateStr}, stopping search`)
      }
    }
    
    console.log(`Finished fetching all entries. Total: ${allEntries.length}`)
    return allEntries
  }, [])

  // Helper function to fetch time entries for a specific date range with pagination
  const fetchTimeEntriesForDateRange = async (
    startDate: string, 
    endDate: string, 
    workspaceId: string, 
    headers: Record<string, string>
  ): Promise<TogglTimeEntry[]> => {
    let entriesForRange: TogglTimeEntry[] = []
    let hasMore = true
    let firstRowNumber: number | null = null
    
    while (hasMore) {
      // Define the request body
      const requestBody: Record<string, string | number | boolean> = {
        start_date: startDate,
        end_date: endDate, 
        page_size: 300, // Increased page size from 50 to 300
        order_by: "date",
        order_dir: "asc"
      }
      
      // Only include first_row_number if we have a valid value from a previous response
      if (firstRowNumber !== null) {
        requestBody.first_row_number = firstRowNumber
        console.log(`Fetching page with first row number: ${firstRowNumber}...`)
      } else {
        console.log(`Fetching first page of entries...`)
      }
      
      try {
        // Call the Reports API to fetch time entries
        const response = await fetch(
          `/toggl/reports/api/v3/workspace/${workspaceId}/search/time_entries`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          }
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch time entries: ${response.status} ${response.statusText} - ${errorText}`)
        }
        
        // Get the X-Next-Row-Number header for pagination
        const nextRowNumber = response.headers.get('X-Next-Row-Number')
        console.log(`Next row number from headers: ${nextRowNumber}`)
        
        // Parse the time entries from the response
        const responseData = await response.json()
        
        if (!responseData || !Array.isArray(responseData)) {
          throw new Error('Invalid response format')
        }
        
        console.log(`Received ${responseData.length} response items.`)
        
        // Define types for the Reports API response structure
        interface TimeEntryItem {
          id: number;
          seconds: number;
          start: string;
          stop: string;
          at: string;
          at_tz: string;
        }
        
        interface ReportsResponseItem {
          user_id: number;
          username: string;
          project_id: number | null;
          task_id: number | null;
          billable: boolean;
          description: string;
          tag_ids: number[];
          time_entries: TimeEntryItem[];
          row_number: number;
        }
        
        // Transform the data from Reports API format to TogglTimeEntry format
        // The response has a nested structure where each item contains a time_entries array
        const transformedEntries: TogglTimeEntry[] = []

        responseData.forEach((item: ReportsResponseItem) => {
          // Process each time entry in the nested time_entries array
          if (item.time_entries && Array.isArray(item.time_entries)) {
            item.time_entries.forEach((entry: TimeEntryItem) => {
              // Map the nested time entry fields to our TogglTimeEntry structure
              const timeEntry: TogglTimeEntry = {
                id: entry.id,
                workspace_id: Number(workspaceId),
                project_id: item.project_id,
                task_id: item.task_id,
                billable: item.billable,
                start: entry.start, // Already in ISO format
                stop: entry.stop, // Already in ISO format
                duration: entry.seconds, // This is the duration in seconds
                description: item.description || '',
                tags: [], // Tags might be available at the parent level
                tag_ids: item.tag_ids || [],
                user_id: item.user_id
              }
              
              // Debug log for problematic entries
              if (!timeEntry.start || !timeEntry.stop || !timeEntry.duration) {
                console.log('Found entry with missing data:', {
                  id: timeEntry.id,
                  start: timeEntry.start,
                  stop: timeEntry.stop,
                  duration: timeEntry.duration,
                  description: timeEntry.description
                })
              }
              
              transformedEntries.push(timeEntry)
            })
          }
        })
        
        console.log(`Extracted ${transformedEntries.length} time entries from response.`)
        
        entriesForRange = [...entriesForRange, ...transformedEntries]
        console.log(`Total entries for this date range so far: ${entriesForRange.length}`)
        
        // Check if there are more entries to fetch
        if (nextRowNumber && transformedEntries.length > 0) {
          firstRowNumber = parseInt(nextRowNumber, 10)
          // Add a small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300))
        } else {
          hasMore = false
          console.log('No more entries for this date range, stopping pagination')
        }
      } catch (error) {
        console.error('Error fetching time entries:', error)
        hasMore = false
      }
    }
    
    // Post-process entries to ensure all required fields have valid values
    const validatedEntries = entriesForRange.map(entry => {
      // Ensure start is a valid ISO string
      if (!entry.start) {
        console.warn(`Entry ${entry.id} missing start time, using fallback.`)
        entry.start = new Date(0).toISOString() // Use epoch time as fallback
      }
      
      // Ensure stop is a valid ISO string for completed entries
      if (!entry.stop && entry.duration > 0) {
        console.warn(`Entry ${entry.id} missing stop time but has duration, calculating stop.`)
        // Calculate stop time from start + duration
        const startDate = new Date(entry.start)
        const stopDate = new Date(startDate.getTime() + entry.duration * 1000)
        entry.stop = stopDate.toISOString()
      }
      
      // Ensure duration is valid
      if (!entry.duration && entry.start && entry.stop) {
        console.warn(`Entry ${entry.id} missing duration but has start/stop times, calculating duration.`)
        // Calculate duration from start and stop times
        const startTime = new Date(entry.start).getTime()
        const stopTime = new Date(entry.stop).getTime()
        entry.duration = Math.round((stopTime - startTime) / 1000)
      }
      
      return entry
    })
    
    console.log(`Returning ${validatedEntries.length} validated entries for date range ${startDate} to ${endDate}`)
    return validatedEntries
  }

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