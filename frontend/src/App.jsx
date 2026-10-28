import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const register = async () => {
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Compte créé");
  };

  const login = async () => {
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Connexion réussie");
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Déconnexion réussie");
  };

  if (session) {
    return (
      <div>
        <h1>Connecté</h1>

        <p>{session.user.email}</p>

        <button onClick={logout}>Se déconnecter</button>

        <p>{message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Authentification</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={register}>Créer un compte</button>

      <button onClick={login}>Se connecter</button>

      <p>{message}</p>
    </div>
  );
}

export default App;
