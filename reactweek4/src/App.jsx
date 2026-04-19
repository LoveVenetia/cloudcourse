import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import './App.css'
import LoginForm from './LoginForm'
import { auth, logout } from './authService'

const ADJECTIVES = [
  'Sneaky',
  'Cosmic',
  'Nimble',
  'Witty',
  'Brave',
  'Mystic',
  'Turbo',
  'Funky',
  'Shadow',
  'Lucky',
]

const ANIMALS = [
  'Panda',
  'Otter',
  'Fox',
  'Falcon',
  'Lynx',
  'Koala',
  'Rabbit',
  'Hedgehog',
  'Tiger',
  'Dolphin',
]

function createCodename() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  const number = Math.floor(Math.random() * 90) + 10

  return `${adjective}${animal}${number}`
}

function App() {
  const [user, setUser] = useState(null)
  const [codename, setCodename] = useState('')
  const [loading, setLoading] = useState(true)

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // If user is logged in, get or create their codename using UID
        const storedCodename = localStorage.getItem(`codename_${firebaseUser.uid}`)
        if (storedCodename) {
          setCodename(storedCodename)
        } else {
          // Create new codename for this user
          const newCodename = createCodename()
          setCodename(newCodename)
          localStorage.setItem(`codename_${firebaseUser.uid}`, newCodename)
        }
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleGenerateNew = () => {
    if (user) {
      const newCodename = createCodename()
      setCodename(newCodename)
      localStorage.setItem(`codename_${user.uid}`, newCodename)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setCodename('')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <main className="app-shell">
        <section className="card">
          <p>Ladataan...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="card">
        {!user ? (
          <>
            <p className="eyebrow">Week 4: Firebase kirjautuminen</p>
            <h1>Kirjaudu sisään</h1>
            <p className="helper">Kirjaudu Firebase-tunnuksillasi päästäksesi koodinimisivulle.</p>

            <LoginForm />
          </>
        ) : (
          <>
            <p className="eyebrow">Tervetuloa agentti</p>
            <h1>👋 Tervetuloa, {codename}</h1>

            <div className="result">
              <p>Sähköposti:</p>
              <strong>{user.email}</strong>
            </div>

            <div className="result">
              <p>Nykyinen koodinimi:</p>
              <strong>{codename}</strong>
            </div>

            <div className="actions">
              <button className="secondary-button" onClick={handleGenerateNew}>
                Generoi uusi nimi
              </button>
              <button className="logout-button" onClick={handleLogout}>
                Kirjaudu ulos
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default App
