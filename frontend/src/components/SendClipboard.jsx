import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { ImagePlus, Send, X } from "lucide-react";

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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Send size={17} />
              Envoyer le texte
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

          <p className="mt-3 break-all text-sm text-slate-600">{image.name}</p>

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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Send size={17} />
              Envoyer l'image
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
