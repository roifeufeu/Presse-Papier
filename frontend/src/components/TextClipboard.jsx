import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function TextClipboard() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([]);

  const loadTexts = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      return;
    }

    const response = await fetch("http://localhost:3000/items", {
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Erreur lors du chargement");
      return;
    }

    setItems(data.items);
  };

  useEffect(() => {
    loadTexts();
  }, []);

  const sendText = async () => {
    setMessage("");

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      setMessage("Tu dois être connecté");
      return;
    }

    const response = await fetch("http://localhost:3000/items/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({
        text,
      }),
    });

    const data = await response.json();

    console.log(data);

    if (!response.ok) {
      setMessage(data.error || "Erreur lors de l'envoi");
      return;
    }

    setMessage("Texte enregistré");
    setText("");

    loadTexts();
  };

  return (
    <div>
      <h2>Envoyer un texte</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Colle ton texte ici"
        rows={8}
        cols={50}
      />

      <br />

      <button onClick={sendText}>Envoyer le texte</button>

      <p>{message}</p>

      <hr />

      <h2>Textes récents</h2>

      {items.length === 0 ? (
        <p>Aucun texte enregistré</p>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <pre>{item.text_content}</pre>
            <hr />
          </div>
        ))
      )}
    </div>
  );
}

export default TextClipboard;
