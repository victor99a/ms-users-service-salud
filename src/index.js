const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const verifySession = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }

  req.user = user;
  next();
};

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, rut, first_names, last_names } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          rut,
          first_names,
          last_names,
          role: 'patient',
          status: 'active' 
        }
      }
    });

    if (error) return res.status(400).json({ error: error.message });
    
    res.status(201).json({ 
      message: "Registro exitoso", 
      user: data.user,
      session: data.session 
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno en registro" });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Login exitoso", session: data.session });
  } catch (err) {
    res.status(500).json({ error: "Error interno en login" });
  }
});

app.get('/patients', verifySession, async (req, res) => {
  try {
    const role = req.user.user_metadata.role || req.user.app_metadata.role;
    
    if (role !== 'specialist' && role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado" });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['patient', 'user']) 
      .order('first_names', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al listar pacientes" });
  }
});

app.post('/medical/records', verifySession, async (req, res) => {
  try {
    const { 
      user_id, blood_type, height, initial_weight, 
      allergies, chronic_diseases, emergency_contact_name, emergency_contact_phone 
    } = req.body;

    if (!user_id) return res.status(400).json({ error: "ID de usuario obligatorio" });

    const { data, error } = await supabase
      .from('medical_records') 
      .insert([{ 
          user_id, 
          blood_type, 
          height: parseFloat(height) || 0, 
          initial_weight: parseFloat(initial_weight) || 0, 
          allergies, 
          chronic_diseases, 
          emergency_contact_name, 
          emergency_contact_phone 
        }]);

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ message: "Ficha creada", data });
  } catch (err) {
    res.status(500).json({ error: "Error procesando ficha" });
  }
});

app.get('/medical/records/:user_id', verifySession, async (req, res) => {
  try {
    const { user_id: rawId } = req.params;
    const user_id = rawId ? rawId.trim().replace(/(\r\n|\n|\r)/gm, "") : null;

    if (!user_id) return res.status(400).json({ error: "ID inválido" });

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });

    if (!data) return res.status(404).json({ message: "Ficha no encontrada" });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener ficha" });
  }
});

app.put('/medical/records/:user_id', verifySession, async (req, res) => {
  try {
    const { user_id } = req.params;
    const { 
      height, current_weight, allergies, chronic_diseases, 
      emergency_contact_name, emergency_contact_phone, blood_type 
    } = req.body;

    const { data, error } = await supabase
      .from('medical_records')
      .update({
        height: parseFloat(height),
        initial_weight: parseFloat(current_weight), 
        allergies,
        chronic_diseases,
        emergency_contact_name,
        emergency_contact_phone,
        blood_type
      })
      .eq('user_id', user_id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ message: "Actualizado correctamente", data });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar" });
  }
});

app.get('/users/:id', verifySession, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: "Perfil no encontrado" });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Error interno" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Microservicio Users corriendo en ${PORT}`));