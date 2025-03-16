export interface TogglUser {
  id: number
  fullname: string
  email: string
  timezone: string
  default_workspace_id: number
}

export interface TogglTimeEntry {
  id: number
  workspace_id: number
  project_id: number | null
  task_id: number | null
  billable: boolean
  start: string
  stop: string
  duration: number
  description: string
  tags: string[]
  tag_ids: number[]
  project?: TogglProject
  user_id: number
}

export interface TogglProject {
  id: number
  workspace_id: number
  client_id: number | null
  name: string
  is_private: boolean
  active: boolean
  at: string
  created_at: string
  color: string
  billable: boolean | null
  auto_estimates: boolean | null
  actual_hours: number | null
  rate: number | null
} 