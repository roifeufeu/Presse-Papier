import { useState } from "react";
import { supabase } from "../lib/supabase";

function TextClipboard({ onItemAdded }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  const sendText = async () => {
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tu dois être connecté");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/items/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erreur lors de l'envoi");
        return;
      }

      setMessage("Texte enregistré");
      setText("");

      onItemAdded?.();
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
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
    </div>
  );
}

export default TextClipboard;
