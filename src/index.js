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

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, rut, first_names, last_names } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          rut: rut,
          first_names: first_names,
          last_names: last_names,
          role: 'patient',
          status: 'active' 
        }
      }
    });

    if (error) return res.status(400).json({ error: error.message });
    
    res.status(201).json({ 
      message: "Registro exitoso en Auth.", 
      user: data.user,
      session: data.session 
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor en el registro" });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: "Login exitoso", session: data.session });
  } catch (err) {
    res.status(500).json({ error: "Error interno en el login" });
  }
});

app.post('/medical/records', async (req, res) => {
  try {
    const { 
      user_id, blood_type, height, initial_weight, 
      allergies, chronic_diseases, emergency_contact_name, emergency_contact_phone 
    } = req.body;

    if (!user_id) return res.status(400).json({ error: "El ID de usuario es obligatorio" });

    const { data, error } = await supabase
      .from('medical_records') 
      .insert([
        { 
          user_id, 
          blood_type, 
          height: parseFloat(height) || 0, 
          initial_weight: parseFloat(initial_weight) || 0, 
          allergies, 
          chronic_diseases, 
          emergency_contact_name, 
          emergency_contact_phone 
        }
      ]);

    if (error) {
      console.error("Error de RLS o Constraint en Supabase:", error.message);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: "Ficha médica guardada exitosamente", data });
  } catch (err) {
    console.error("Error en el microservicio:", err);
    res.status(500).json({ error: "Error procesando la ficha médica" });
  }
});

app.get('/medical/records/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) return res.status(400).json({ error: "Falta el ID del usuario" });
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: "Aún no has llenado tu ficha médica." });
      }
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener la ficha" });
  }
});

app.put('/medical/records/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const { 
      height, 
      current_weight, 
      allergies, 
      chronic_diseases, 
      emergency_contact_name, 
      emergency_contact_phone,
      blood_type 
    } = req.body;

    if (!user_id) return res.status(400).json({ error: "Falta ID de usuario" });

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

    res.status(200).json({ message: "Perfil actualizado correctamente", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "Falta el ID del usuario" });

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error buscando perfil:", error);
      return res.status(404).json({ error: "Usuario no encontrado en profiles" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error interno:", err);
    res.status(500).json({ error: "Error al obtener perfil del usuario" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Microservicio de Usuarios corriendo en puerto ${PORT}`));