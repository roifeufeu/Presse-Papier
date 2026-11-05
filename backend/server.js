require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);

const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const app = express();
const PORT = 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  defParamCharset: "utf8",

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Mo maximum
  },

  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Le fichier doit être une image"));
    }

    cb(null, true);
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend OK" });
});

app.get("/test-supabase", async (req, res) => {
  const { data, error } = await supabase.from("clipboard_items").select("id");

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  res.json({
    success: true,
    message: "Connexion Supabase OK",
    data,
  });
});

app.get("/test-auth", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      success: false,
      error: "Token invalide",
    });
  }

  res.json({
    success: true,
    message: "Utilisateur authentifié",
    user: {
      id: user.id,
      email: user.email,
    },
  });
});

app.post("/items/text", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({
      success: false,
      error: "Utilisateur non authentifié",
    });
  }

  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: "Le texte est vide",
    });
  }

  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data, error } = await userSupabase
    .from("clipboard_items")
    .insert({
      user_id: user.id,
      type: "text",
      text_content: text,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  res.status(201).json({
    success: true,
    message: "Texte enregistré",
    item: data,
  });
});

app.post("/items/image", upload.single("image"), async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({
      success: false,
      error: "Utilisateur non authentifié",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "Aucune image envoyée",
    });
  }

  console.log("Nom reçu par Multer :", req.file.originalname);

  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const extension = path.extname(req.file.originalname).toLowerCase();
  const fileName = `${crypto.randomUUID()}${extension}`;
  const storagePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await userSupabase.storage
    .from("clipboard-images")
    .upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    return res.status(500).json({
      success: false,
      error: uploadError.message,
    });
  }

  const { data, error: databaseError } = await userSupabase
    .from("clipboard_items")
    .insert({
      user_id: user.id,
      type: "image",
      storage_path: storagePath,
      original_filename: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
    })
    .select()
    .single();

  if (databaseError) {
    await userSupabase.storage.from("clipboard-images").remove([storagePath]);

    return res.status(500).json({
      success: false,
      error: databaseError.message,
    });
  }

  res.status(201).json({
    success: true,
    message: "Image enregistrée",
    item: data,
  });
});

app.get("/items", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({
      success: false,
      error: "Utilisateur non authentifié",
    });
  }

  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data, error } = await userSupabase
    .from("clipboard_items")
    .select("*")
    .eq("type", "text")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  res.json({
    success: true,
    items: data,
  });
});

app.get("/items/images", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({
      success: false,
      error: "Utilisateur non authentifié",
    });
  }

  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data: items, error } = await userSupabase
    .from("clipboard_items")
    .select("*")
    .eq("type", "image")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  const images = await Promise.all(
    items.map(async (item) => {
      const { data, error: signedUrlError } = await userSupabase.storage
        .from("clipboard-images")
        .createSignedUrl(item.storage_path, 3600);

      if (signedUrlError) {
        return {
          ...item,
          image_url: null,
        };
      }

      return {
        ...item,
        image_url: data.signedUrl,
      };
    }),
  );

  res.json({
    success: true,
    items: images,
  });
});

app.get("/items/history", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({
      success: false,
      error: "Utilisateur non authentifié",
    });
  }

  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data: items, error } = await userSupabase
    .from("clipboard_items")
    .select("*")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  const history = await Promise.all(
    items.map(async (item) => {
      if (item.type !== "image" || !item.storage_path) {
        return item;
      }

      const { data, error: signedUrlError } = await userSupabase.storage
        .from("clipboard-images")
        .createSignedUrl(item.storage_path, 3600);

      if (signedUrlError) {
        return {
          ...item,
          image_url: null,
        };
      }

      return {
        ...item,
        image_url: data.signedUrl,
      };
    }),
  );

  res.json({
    success: true,
    items: history,
  });
});

app.delete("/items/:id", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  const token = authHeader.split(" ")[1];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({
      success: false,
      error: "Utilisateur non authentifié",
    });
  }

  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  // On récupère d'abord l'élément
  const { data: item, error: itemError } = await userSupabase
    .from("clipboard_items")
    .select("id, type, storage_path")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemError) {
    return res.status(500).json({
      success: false,
      error: itemError.message,
    });
  }

  if (!item) {
    return res.status(404).json({
      success: false,
      error: "Élément introuvable",
    });
  }

  // Si c'est une image, on supprime d'abord le fichier réel
  if (item.type === "image" && item.storage_path) {
    const { error: storageError } = await userSupabase.storage
      .from("clipboard-images")
      .remove([item.storage_path]);

    if (storageError) {
      return res.status(500).json({
        success: false,
        error: "Impossible de supprimer l'image du stockage",
      });
    }
  }

  // Puis on supprime l'entrée BDD
  const { error: deleteError } = await userSupabase
    .from("clipboard_items")
    .delete()
    .eq("id", item.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return res.status(500).json({
      success: false,
      error: deleteError.message,
    });
  }

  res.json({
    success: true,
    message: "Élément supprimé",
  });
});

app.post("/maintenance/cleanup-expired", async (req, res) => {
  const cleanupSecret = req.headers["x-cleanup-secret"];

  if (!cleanupSecret || cleanupSecret !== process.env.CLEANUP_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Non autorisé",
    });
  }

  const now = new Date().toISOString();

  // 1. Récupérer tous les éléments expirés
  const { data: expiredItems, error: selectError } = await adminSupabase
    .from("clipboard_items")
    .select("id, type, storage_path")
    .lte("expires_at", now);

  if (selectError) {
    return res.status(500).json({
      success: false,
      error: selectError.message,
    });
  }

  if (!expiredItems || expiredItems.length === 0) {
    return res.json({
      success: true,
      deleted: 0,
      message: "Aucun élément expiré",
    });
  }

  // 2. Récupérer les fichiers images à supprimer
  const imagePaths = expiredItems
    .filter((item) => item.type === "image" && item.storage_path)
    .map((item) => item.storage_path);

  // 3. Supprimer les fichiers réels dans Storage
  if (imagePaths.length > 0) {
    const { error: storageError } = await adminSupabase.storage
      .from("clipboard-images")
      .remove(imagePaths);

    if (storageError) {
      return res.status(500).json({
        success: false,
        error: "Impossible de supprimer les images expirées",
      });
    }
  }

  // 4. Supprimer les lignes de la BDD
  const expiredIds = expiredItems.map((item) => item.id);

  const { error: deleteError } = await adminSupabase
    .from("clipboard_items")
    .delete()
    .in("id", expiredIds);

  if (deleteError) {
    return res.status(500).json({
      success: false,
      error: deleteError.message,
    });
  }

  res.json({
    success: true,
    deleted: expiredItems.length,
    deletedImages: imagePaths.length,
    message: "Nettoyage terminé",
  });
});

app.use((err, req, res, next) => {
  console.error("Erreur serveur :", err);

  // Erreurs liées à Multer

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: "Image trop volumineuse (maximum 10 Mo)",
      });
    }

    return res.status(400).json({
      success: false,
      error: "Erreur lors de l'envoi du fichier",
    });
  }

  // Fichier non autorisé
  if (err.message === "Le fichier doit être une image") {
    return res.status(400).json({
      success: false,
      error: "Le fichier doit être une image",
    });
  }

  // JSON invalide
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Les données envoyées sont invalides",
    });
  }

  // Autres erreurs inattendues
  return res.status(500).json({
    success: false,
    error: "Une erreur interne est survenue",
  });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
