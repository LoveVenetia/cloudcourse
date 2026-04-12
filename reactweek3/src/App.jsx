import { useEffect, useState } from 'react'
import './App.css'

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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [codename, setCodename] = useState('')

  useEffect(() => {
    const savedLoginState = localStorage.getItem('isLoggedIn') === 'true'
    const savedCodename = localStorage.getItem('codename')

    if (savedLoginState && savedCodename) {
      setIsLoggedIn(true)
      setCodename(savedCodename)
    }
  }, [])

  const generateAndSaveCodename = () => {
    const newCodename = createCodename()
    setCodename(newCodename)
    localStorage.setItem('codename', newCodename)
  }

  const handleLogin = () => {
    generateAndSaveCodename()
    setIsLoggedIn(true)
    localStorage.setItem('isLoggedIn', 'true')
  }

  const handleGenerateNew = () => {
    generateAndSaveCodename()
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem('isLoggedIn')
  }

  return (
    <main className="app-shell">
      <section className="card">
        {!isLoggedIn ? (
          <>
            <p className="eyebrow">Week 3: React kirjautuminen</p>
            <h1>Kirjaudu sisaan</h1>
            <p className="helper">Avaa koodinimisivu kirjautumalla sisaan.</p>

            <button className="login-button" onClick={handleLogin}>
              Kirjaudu sisaan
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">Tervetuloa agentti</p>
            <h1>Koodinimisivu</h1>

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
