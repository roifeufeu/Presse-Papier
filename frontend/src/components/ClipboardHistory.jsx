import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function expirationLabel(expiresAt) {
  if (!expiresAt) return null;

  const difference = new Date(expiresAt).getTime() - Date.now();

  if (!Number.isFinite(difference)) return null;
  if (difference <= 0) return "Expiré";

  if (difference < 60 * 60 * 1000) {
    return `Expire dans ${Math.ceil(difference / 60000)} min`;
  }

  if (difference < 24 * 60 * 60 * 1000) {
    return `Expire dans ${Math.ceil(difference / 3600000)} h`;
  }

  return `Expire dans ${Math.ceil(difference / 86400000)} j`;
}

function ageLabel(createdAt) {
  const elapsed = Date.now() - new Date(createdAt).getTime();

  if (!Number.isFinite(elapsed)) return "Date inconnue";
  if (elapsed < 60000) return "À l'instant";

  if (elapsed < 3600000) {
    return `Il y a ${Math.floor(elapsed / 60000)} min`;
  }

  if (elapsed < 86400000) {
    return `Il y a ${Math.floor(elapsed / 3600000)} h`;
  }

  return `Il y a ${Math.floor(elapsed / 86400000)} j`;
}

function sizeLabel(bytes) {
  if (typeof bytes !== "number") return null;

  if (bytes < 1024) {
    return `${bytes} o`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString("fr-FR", {
      maximumFractionDigits: 1,
    })} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} Mo`;
}

function ClipboardHistory({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setItems([]);
        return;
      }

      const response = await fetch("http://localhost:3000/items/history", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger l'historique");
      }

      setItems(data.items);
    } catch (error) {
      setMessage(error.message || "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void loadHistory();
    }, 0);

    const interval = setInterval(() => {
      void loadHistory();
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

      const blobUrl = URL.createObjectURL(await response.blob());

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "image";

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

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Tu dois être connecté");
        return;
      }

      const response = await fetch(`http://localhost:3000/items/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setMessage("Élément supprimé");
      await loadHistory();
    } catch (error) {
      setMessage(error.message || "Impossible de contacter le serveur");
    }
  };

  const visibleItems = items.filter(
    (item) => filter === "all" || item.type === filter,
  );

  if (loading) {
    return (
      <p className="text-sm text-slate-500">Chargement de l'historique...</p>
    );
  }

  return (
    <div>
      {/* Titre et filtres */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Vos éléments récents
        </h2>

        <div className="flex gap-2" aria-label="Filtrer l'historique">
          {[
            { value: "all", label: "Tous" },
            { value: "text", label: "Textes" },
            { value: "image", label: "Images" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={
                filter === option.value
                  ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p role="status" className="mb-4 text-sm text-slate-600">
          {message}
        </p>
      )}

      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Aucun élément à afficher.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const isExpanded = expandedIds.includes(item.id);
            const text = item.text_content || "";

            const isLong = text.length > 120 || text.split(/\r?\n/).length > 3;

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                {/* Carte TEXTE */}
                {item.type === "text" ? (
                  <>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <FileText size={17} className="text-blue-600" />
                      Texte
                    </div>

                    <pre
                      className={`rounded-lg bg-slate-50 p-3 font-mono text-sm leading-6 whitespace-pre-wrap break-words text-slate-800 ${
                        isExpanded
                          ? "max-h-96 overflow-y-auto"
                          : "line-clamp-3 overflow-hidden"
                      }`}
                    >
                      {text}
                    </pre>

                    {isLong && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIds((previous) =>
                            isExpanded
                              ? previous.filter((id) => id !== item.id)
                              : [...previous, item.id],
                          )
                        }
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}

                        {isExpanded ? "Voir moins" : "Voir plus"}
                      </button>
                    )}
                  </>
                ) : (
                  /* Carte IMAGE */
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Miniature */}
                    <div className="flex h-48 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:h-32 sm:w-44">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.original_filename || "Image"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ImageIcon size={32} className="text-slate-400" />
                      )}
                    </div>

                    {/* Informations image */}
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-medium text-slate-900">
                        {item.original_filename || "Image"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {sizeLabel(item.file_size)}
                      </p>

                      {!item.image_url && (
                        <p className="mt-2 text-sm text-slate-500">
                          Aperçu indisponible
                        </p>
                      )}

                      {/* Dates et actions image */}
                      <div className="mt-4 border-t border-slate-100 pt-3 sm:mt-3 sm:border-t-0 sm:pt-0">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{ageLabel(item.created_at)}</span>
                          <span>{expirationLabel(item.expires_at)}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {item.image_url && (
                            <button
                              type="button"
                              onClick={() =>
                                downloadImage(
                                  item.image_url,
                                  item.original_filename,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Download size={16} />
                              Télécharger
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            aria-label="Supprimer l'élément"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates et actions TEXTE */}
                {item.type === "text" && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{ageLabel(item.created_at)}</span>

                      <span>{expirationLabel(item.expires_at)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(text)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Copy size={16} />
                        Copier
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        aria-label="Supprimer l'élément"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ClipboardHistory;
