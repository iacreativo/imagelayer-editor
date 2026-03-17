import { useState, useEffect } from 'react'
import { ProjectListItem, projectService, ProjectData } from './services/projectService'
import { authService, User } from './services/authService'

interface ProjectListProps {
  onSelectProject: (projectId: string) => void
  onLogout: () => void
}

export const ProjectList = ({ onSelectProject, onLogout }: ProjectListProps) => {
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    loadProjects()
    setUser(authService.getStoredUser())
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (err) {
      console.error('Error loading projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    
    setCreating(true)
    setError('')
    try {
      const project = await projectService.createProject(newProjectName.trim())
      setProjects([project, ...projects])
      setShowCreateModal(false)
      setNewProjectName('')
      onSelectProject(project.id)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear proyecto')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de eliminar este proyecto?')) return
    
    try {
      await projectService.deleteProject(id)
      setProjects(projects.filter(p => p.id !== id))
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Mis Proyectos</h1>
          <p style={styles.welcome}>Bienvenido, {user?.email}</p>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>
          Cerrar sesión
        </button>
      </header>

      <div style={styles.content}>
        <div style={styles.projectsHeader}>
          <h2 style={styles.sectionTitle}>Proyectos ({projects.length})</h2>
          <button onClick={() => setShowCreateModal(true)} style={styles.newButton}>
            + Nuevo Proyecto
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Cargando proyectos...</div>
        ) : projects.length === 0 ? (
          <div style={styles.empty}>
            <p>No tienes proyectos todavía</p>
            <button onClick={() => setShowCreateModal(true)} style={styles.emptyButton}>
              Crear tu primer proyecto
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                style={styles.projectCard}
              >
                <div style={styles.projectThumbnail}>
                  {project.thumbnail ? (
                    <img src={project.thumbnail} alt={project.name} style={styles.thumbnailImage} />
                  ) : (
                    <div style={styles.placeholderThumb}>🎨</div>
                  )}
                </div>
                <div style={styles.projectInfo}>
                  <h3 style={styles.projectName}>{project.name}</h3>
                  <p style={styles.projectDate}>Actualizado: {formatDate(project.updated_at)}</p>
                </div>
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  style={styles.deleteButton}
                  title="Eliminar proyecto"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Nuevo Proyecto</h3>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nombre del proyecto"
              style={styles.modalInput}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.modalButtons}>
              <button onClick={() => setShowCreateModal(false)} style={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleCreateProject} disabled={creating} style={styles.createButton}>
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: '#16213e',
    borderBottom: '1px solid #0f3460'
  },
  title: {
    margin: 0,
    fontSize: '24px'
  },
  welcome: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#888'
  },
  logoutButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #e94560',
    background: 'transparent',
    color: '#e94560',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500
  },
  content: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  projectsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#aaa'
  },
  newButton: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#888'
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#888'
  },
  emptyButton: {
    marginTop: '16px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px'
  },
  projectCard: {
    background: '#16213e',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    border: '1px solid #0f3460'
  },
  projectThumbnail: {
    width: '100%',
    height: '160px',
    background: '#0f3460',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  placeholderThumb: {
    fontSize: '48px'
  },
  projectInfo: {
    padding: '16px'
  },
  projectName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  projectDate: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#888'
  },
  deleteButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'rgba(0,0,0,0.6)',
    border: 'none',
    borderRadius: '6px',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#16213e',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px'
  },
  modalTitle: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    textAlign: 'center'
  },
  modalInput: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid #0f3460',
    background: '#0f3460',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  error: {
    marginTop: '12px',
    padding: '10px',
    borderRadius: '8px',
    background: 'rgba(233, 69, 96, 0.1)',
    border: '1px solid #e94560',
    color: '#e94560',
    fontSize: '13px',
    textAlign: 'center'
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #0f3460',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '14px'
  },
  createButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600
  }
}
