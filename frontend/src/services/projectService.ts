import api from './authService'

export interface ProjectListItem {
  id: string
  name: string
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export interface ProjectData {
  layers: any[]
  graphics: any[]
  history: any[]
  canvasSettings: {
    width: number
    height: number
    zoom: number
    position: { x: number; y: number }
  }
}

export interface Project {
  id: string
  user_id: string
  name: string
  thumbnail: string | null
  data: ProjectData
  created_at: string
  updated_at: string
}

export const projectService = {
  getProjects: async (): Promise<ProjectListItem[]> => {
    const response = await api.get<{ projects: ProjectListItem[] }>('/projects')
    return response.data.projects
  },

  getProject: async (id: string): Promise<Project> => {
    const response = await api.get<{ project: Project }>(`/projects/${id}`)
    return response.data.project
  },

  createProject: async (name: string, data?: ProjectData): Promise<Project> => {
    const response = await api.post<{ project: Project }>('/projects', {
      name,
      data: data || {
        layers: [],
        graphics: [],
        history: [],
        canvasSettings: { width: 800, height: 600, zoom: 1, position: { x: 0, y: 0 } }
      }
    })
    return response.data.project
  },

  updateProject: async (id: string, updates: { name?: string; data?: ProjectData; thumbnail?: string }): Promise<Project> => {
    const response = await api.put<{ project: Project }>(`/projects/${id}`, updates)
    return response.data.project
  },

  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`)
  }
}
