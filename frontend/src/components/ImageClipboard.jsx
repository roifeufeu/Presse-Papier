import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function ImageClipboard() {
  const [image, setImage] = useState(null);
  const [images, setImages] = useState([]);
  const [message, setMessage] = useState("");

  const loadImages = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/items/images", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erreur lors du chargement des images");
        return;
      }

      setImages(data.items);
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
  };
  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/items/images", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setMessage(data.error || "Erreur lors du chargement des images");
          }
          return;
        }

        if (!cancelled) {
          setImages(data.items);
        }
      } catch {
        if (!cancelled) {
          setMessage("Impossible de contacter le serveur");
        }
      }
    };

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  const sendImage = async () => {
    setMessage("");

    if (!image) {
      setMessage("Choisis une image");
      return;
    }

    console.log("Nom côté navigateur :", image.name);

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

      await loadImages();
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
  };

  const downloadImage = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error();
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setMessage("Impossible de télécharger l'image");
    }
  };

  const deleteImage = async (id) => {
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Tu dois être connecté");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/items/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erreur lors de la suppression");
        return;
      }

      setMessage("Image supprimée");

      await loadImages();
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

      <hr />

      <h2>Images récentes</h2>

      {images.length === 0 ? (
        <p>Aucune image enregistrée</p>
      ) : (
        images.map((item) => (
          <div key={item.id}>
            {item.image_url ? (
              <>
                <img
                  src={item.image_url}
                  alt={item.original_filename}
                  style={{
                    maxWidth: "300px",
                    maxHeight: "300px",
                  }}
                />

                <p>{item.original_filename}</p>

                <button
                  onClick={() =>
                    downloadImage(item.image_url, item.original_filename)
                  }
                >
                  Télécharger
                </button>

                <button onClick={() => deleteImage(item.id)}>Supprimer</button>
              </>
            ) : (
              <p>Impossible de charger cette image</p>
            )}

            <hr />
          </div>
        ))
      )}
    </div>
  );
}

export default ImageClipboard;
