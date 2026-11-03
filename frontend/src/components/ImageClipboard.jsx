import { useState } from "react";
import { supabase } from "../lib/supabase";

function ImageClipboard({ onItemAdded }) {
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");

  const sendImage = async () => {
    setMessage("");

    if (!image) {
      setMessage("Choisis une image");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tu dois être connecté");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("http://localhost:3000/items/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erreur lors de l'envoi");
        return;
      }

      setMessage("Image enregistrée");
      setImage(null);

      onItemAdded?.();
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
  };

  return (
    <div>
      <h2>Envoyer une image</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0] || null)}
      />

      <br />

      <button onClick={sendImage}>Envoyer l'image</button>

      <p>{message}</p>
    </div>
  );
}

export default ImageClipboard;
