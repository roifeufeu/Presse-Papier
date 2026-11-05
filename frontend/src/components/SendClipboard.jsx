import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { ImagePlus, Send, X } from "lucide-react";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function SendClipboard({ onItemAdded }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);
  const sendingRef = useRef(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (message !== "Texte enregistré" && message !== "Image enregistrée") {
      return;
    }

    const timeout = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [message]);

  const chooseImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event) => {
    const selectedImage = event.target.files?.[0];

    if (!selectedImage) return;

    if (!selectedImage.type.startsWith("image/")) {
      setMessage("Le fichier doit être une image");
      event.target.value = "";
      return;
    }

    if (selectedImage.size > MAX_IMAGE_SIZE) {
      const size = (selectedImage.size / (1024 * 1024)).toLocaleString(
        "fr-FR",
        {
          maximumFractionDigits: 2,
        },
      );

      setMessage(`Image trop volumineuse (${size} Mo / 10 Mo maximum)`);

      event.target.value = "";
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
    // Empêcher plusieurs envois simultanés
    if (sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setMessage("Impossible de vérifier la session. Réessaie.");
        return;
      }

      if (!session) {
        setMessage("Tu dois être connecté pour envoyer un texte");
        return;
      }

      const response = await fetch("http://localhost:3000/items/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage(
          "Session expirée ou invalide. Déconnecte-toi puis reconnecte-toi.",
        );
        return;
      }

      if (!response.ok) {
        setMessage(data.error || "Erreur lors de l'envoi");
        return;
      }

      setText("");
      setMessage("Texte enregistré");
      onItemAdded?.();
    } catch {
      setMessage("Impossible de contacter le serveur ou de traiter sa réponse");
    } finally {
      // Réactiver le bouton dans tous les cas
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const sendImage = async () => {
    if (!image || sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setMessage("Impossible de vérifier la session. Réessaie.");
        return;
      }

      if (!session) {
        setMessage("Tu dois être connecté pour envoyer une image");
        return;
      }

      const formData = new FormData();
      formData.append("image", image);

      const response = await fetch("http://localhost:3000/items/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage(
          "Session expirée ou invalide. Déconnecte-toi puis reconnecte-toi.",
        );
        return;
      }

      if (!response.ok) {
        setMessage(data.error || "Erreur lors de l'envoi");
        return;
      }

      clearImage();
      setMessage("Image enregistrée");
      onItemAdded?.();
    } catch {
      setMessage("Impossible de contacter le serveur ou de traiter sa réponse");
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Envoyer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Transférez du texte ou une image entre vos appareils.
        </p>
      </div>

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
            placeholder="Collez votre texte ici..."
            rows={7}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={chooseImage}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ImagePlus size={18} />
              Joindre une image
            </button>

            <button
              type="button"
              onClick={sendText}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
              {isSending ? "Envoi en cours..." : "Envoyer le texte"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
            <img
              src={previewUrl}
              alt="Prévisualisation"
              className="max-h-72 max-w-full rounded-lg object-contain"
            />
          </div>

          <div className="mt-3">
            <p className="break-all text-sm font-medium text-slate-700">
              {image.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Taille :{" "}
              {(image.size / (1024 * 1024)).toLocaleString("fr-FR", {
                maximumFractionDigits: 2,
              })}{" "}
              Mo / 10 Mo maximum
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={clearImage}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <X size={17} />
              Annuler
            </button>

            <button
              type="button"
              onClick={sendImage}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
              {isSending ? "Envoi en cours..." : "Envoyer l'image"}
            </button>
          </div>
        </>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-slate-600">
          {message}
        </p>
      )}
    </section>
  );
}

export default SendClipboard;
