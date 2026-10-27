import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("Chargement...");

  useEffect(() => {
    fetch("http://localhost:3000")
      .then((response) => response.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Erreur de connexion au backend"));
  }, []);

  return (
    <main>
      <h1>Presse-papier</h1>
      <p>{message}</p>
    </main>
  );
}

export default App;
