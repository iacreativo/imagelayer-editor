import { useState } from 'react'
import { authService } from './services/authService'

interface LoginScreenProps {
  onLogin: () => void
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    if (isRegister && password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        await authService.register(email, password)
      } else {
        await authService.login(email, password)
      }
      onLogin()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Image Layer Editor</h1>
        <p style={styles.subtitle}>{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="tu@email.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          {isRegister && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={styles.switchText}>
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={styles.switchButton}
          >
            {isRegister ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#1a1a2e',
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#16213e',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    color: '#fff',
    textAlign: 'center'
  },
  subtitle: {
    margin: '0 0 32px 0',
    fontSize: '14px',
    color: '#888',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 500
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #0f3460',
    background: '#0f3460',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  error: {
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(233, 69, 96, 0.1)',
    border: '1px solid #e94560',
    color: '#e94560',
    fontSize: '13px',
    textAlign: 'center'
  },
  button: {
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '8px'
  },
  switchText: {
    margin: '24px 0 0 0',
    fontSize: '13px',
    color: '#888',
    textAlign: 'center'
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#e94560',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    marginLeft: '8px',
    textDecoration: 'underline'
  }
}
