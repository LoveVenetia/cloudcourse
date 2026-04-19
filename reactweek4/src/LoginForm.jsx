import { useState } from "react";
import { loginWithEmail } from "./authService";
import "./LoginForm.css";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Tuntematon virhe");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Kirjaudu sisään</h2>

      <div className="form-group">
        <label htmlFor="email">Sähköposti</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Salasana</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading} className="submit-button">
        {loading ? "Kirjaudutaan..." : "Kirjaudu"}
      </button>
    </form>
  );
};

export default LoginForm;
