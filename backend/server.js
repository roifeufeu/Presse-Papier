require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY,
);

const app = express();
const PORT = 3000;

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

  const { error } = await userSupabase
    .from("clipboard_items")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", user.id);

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  res.json({
    success: true,
    message: "Texte supprimé",
  });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
