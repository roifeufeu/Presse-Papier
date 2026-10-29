import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

async function fetchTexts() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return [];
  }

  const response = await fetch("http://localhost:3000/items", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erreur lors du chargement");
  }

  return data.items;
}

function TextClipboard() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchTexts()
      .then((texts) => {
        if (!cancelled) {
          setItems(texts);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadTexts = async () => {
    try {
      const texts = await fetchTexts();
      setItems(texts);
    } catch (error) {
      setMessage(error.message);
    }
  };

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

      await loadTexts();
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
