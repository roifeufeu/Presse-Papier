require("dotenv").config();
const supabase = require("./supabase");

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Backend OK" });
});

/////////////////////////////

app.get("/test-supabase", async (req, res) => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    message: "Connexion Supabase OK",
    session: data.session,
  });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
