import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function SendClipboard({ onItemAdded }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);

  const chooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event) => {
    const selectedImage = event.target.files?.[0];

    if (!selectedImage) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImage(selectedImage);
    setPreviewUrl(URL.createObjectURL(selectedImage));
    setMessage("");
  };

  const clearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImage(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

      setText("");
      setMessage("Texte enregistré");

      onItemAdded?.();
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
  };

  const sendImage = async () => {
    setMessage("");

    if (!image) {
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

      clearImage();

      setMessage("Image enregistrée");

      onItemAdded?.();
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
  };

  return (
    <div>
      <h2>Envoyer</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        hidden
      />

      {!image ? (
        <>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Colle ton texte ici"
            rows={8}
            cols={50}
          />

          <br />

          <button onClick={chooseImage}>Choisir une image</button>

          <button onClick={sendText}>Envoyer le texte</button>
        </>
      ) : (
        <>
          <img
            src={previewUrl}
            alt="Prévisualisation"
            style={{
              maxWidth: "300px",
              maxHeight: "300px",
            }}
          />

          <p>{image.name}</p>

          <button onClick={sendImage}>Envoyer l'image</button>

          <button onClick={clearImage}>Annuler</button>
        </>
      )}

      <p>{message}</p>
    </div>
  );
}

export default SendClipboard;
