const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require("express");
const cors = require("cors");

const supabaseAuth = require("./supabaseAuth");
const supabaseAdmin = require("./supabaseAdmin");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const verifySession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token no proporcionado" });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user)
    return res.status(401).json({ error: "Sesión inválida o expirada" });

  req.user = user;
  next();
};

app.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, rut, first_names, last_names } = req.body;

    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          rut, first_names, last_names, role: "patient", status: "active",
        },
      },
    });

    if (authError) return res.status(400).json({ error: authError.message });
    if (!authData.user) return res.status(400).json({ error: "No se pudo crear el usuario en Auth" });

    const { error: profileError } = await supabaseAdmin.from("profiles").insert([
      {
        id: authData.user.id,
        email, rut, first_names, last_names,
        role: "patient", status: "active",
      },
    ]);

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return res.status(400).json({ error: "Error al crear perfil: " + profileError.message });
    }

    res.status(201).json({
      message: "Registro exitoso y perfil creado",
      user: authData.user,
      session: authData.session,
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno en registro" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Login exitoso", session: data.session });
  } catch (err) {
    res.status(500).json({ error: "Error interno en login" });
  }
});

app.get("/patients", verifySession, async (req, res) => {
  try {
    const role = req.user.user_metadata.role || req.user.app_metadata.role;
    if (role !== "specialist" && role !== "admin")
      return res.status(403).json({ error: "Acceso denegado" });

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("role", ["patient", "user"])
      .order("first_names", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al listar pacientes" });
  }
});

app.post("/medical/records", verifySession, async (req, res) => {
  try {
    const {
      user_id, blood_type, height, initial_weight,
      allergies, chronic_diseases, emergency_contact_name, emergency_contact_phone,
    } = req.body;

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!user_id || !uuidRegex.test(user_id)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    const { data, error } = await supabaseAdmin.from("medical_records").insert([
      {
        user_id, blood_type,
        height: parseFloat(height) || 0,
        initial_weight: parseFloat(initial_weight) || 0,
        allergies, chronic_diseases,
        emergency_contact_name, emergency_contact_phone,
      },
    ]);

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: "Ficha creada", data });
  } catch (err) {
    res.status(500).json({ error: "Error procesando ficha" });
  }
});

app.get("/medical/records/:user_id", verifySession, async (req, res) => {
  try {
    const { user_id } = req.params;

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!user_id || !uuidRegex.test(user_id)) {
       return res.status(400).json({ error: "ID inválido" });
    }

    const { data, error } = await supabaseAdmin
      .from("medical_records")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (error) {
       if (error.code === 'PGRST116') return res.status(404).json({ message: "Ficha no encontrada" });
       return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ficha" });
  }
});

app.put("/medical/records/:user_id", verifySession, async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!user_id || !uuidRegex.test(user_id)) {
       return res.status(400).json({ error: "ID inválido" });
    }

    const {
      height, current_weight, allergies, chronic_diseases,
      emergency_contact_name, emergency_contact_phone, blood_type,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from("medical_records")
      .update({
        height: parseFloat(height),
        allergies, chronic_diseases,
        emergency_contact_name, emergency_contact_phone, blood_type,
      })
      .eq("user_id", user_id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Actualizado correctamente", data });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar" });
  }
});

app.get("/users/:id", verifySession, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return res.status(404).json({ error: "Perfil no encontrado" });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Microservicio Users corriendo en ${PORT}`));