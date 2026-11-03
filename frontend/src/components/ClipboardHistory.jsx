import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function getTimeUntilExpiration(expiresAt) {
  if (!expiresAt) {
    return null;
  }

  const now = new Date();
  const expiration = new Date(expiresAt);

  const difference = expiration - now;

  if (difference <= 0) {
    return "Expiré";
  }

  const minutes = Math.ceil(difference / (1000 * 60));
  const hours = Math.ceil(difference / (1000 * 60 * 60));
  const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

  if (difference < 1000 * 60 * 60) {
    return `Expire dans ${minutes} min`;
  }

  if (difference < 1000 * 60 * 60 * 24) {
    return `Expire dans ${hours} h`;
  }

  return `Expire dans ${days} j`;
}

function ClipboardHistory({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/items/history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Erreur lors du chargement de l'historique");
        return;
      }

      setItems(data.items);
    } catch {
      setMessage("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      loadHistory();
    }, 0);

    const interval = setInterval(() => {
      loadHistory();
    }, 60000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadHistory, refreshKey]);

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Texte copié");
    } catch {
      setMessage("Impossible de copier le texte");
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

  const deleteItem = async (id) => {
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

      setMessage("Élément supprimé");

      await loadHistory();
    } catch {
      setMessage("Impossible de contacter le serveur");
    }
  };

  if (loading) {
    return <p>Chargement de l'historique...</p>;
  }

  return (
    <div>
      <h2>Éléments récents</h2>

      <p>{message}</p>

      {items.length === 0 ? (
        <p>Aucun élément enregistré</p>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            {item.type === "text" && (
              <>
                <pre>{item.text_content}</pre>

                <button onClick={() => copyText(item.text_content)}>
                  Copier
                </button>
              </>
            )}

            {item.type === "image" && (
              <>
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
                  </>
                ) : (
                  <p>Impossible de charger cette image</p>
                )}
              </>
            )}

            <p>{getTimeUntilExpiration(item.expires_at)}</p>

            <button onClick={() => deleteItem(item.id)}>Supprimer</button>

            <hr />
          </div>
        ))
      )}
    </div>
  );
}

export default ClipboardHistory;
