const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');
const { encryptData, decryptData } = require('./utils/crypto');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- RUTA 1: REGISTRO DE USUARIO ---
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

// --- RUTA 2: LOGIN DE USUARIO ---
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ error: error.message });
    
    res.status(200).json({ 
        message: "Login exitoso", 
        session: data.session,
        user: data.user 
    });
  } catch (err) {
    res.status(500).json({ error: "Error interno en el login" });
  }
});

// --- RUTA 3: FICHA MÉDICA  ---
app.post('/medical/records', async (req, res) => {
  try {
    const { 
      user_id, blood_type, height, initial_weight, 
      allergies, chronic_diseases, emergency_contact_name, emergency_contact_phone 
    } = req.body;

    if (!user_id) return res.status(400).json({ error: "El ID de usuario es obligatorio" });

    const encryptedPhone = encryptData(emergency_contact_phone);
    const encryptedDiseases = encryptData(chronic_diseases);
    const encryptedAllergies = encryptData(allergies); 

    const { data, error } = await supabase
      .from('medical_records') 
      .insert([
        { 
          user_id, 
          blood_type, 
          height: parseFloat(height) || 0, 
          initial_weight: parseFloat(initial_weight) || 0, 
          allergies: encryptedAllergies, 
          chronic_diseases: encryptedDiseases,
          emergency_contact_name, 
          emergency_contact_phone: encryptedPhone //
        }
      ]);

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ message: "Ficha médica protegida y guardada.", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error procesando la ficha" });
  }
});

// --- OBTENER FICHA MÉDICA (LEER DESENCRIPTADO) ---
app.get('/medical/records/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    if (data) {
        data.emergency_contact_phone = decryptData(data.emergency_contact_phone);
        data.chronic_diseases = decryptData(data.chronic_diseases);
        data.allergies = decryptData(data.allergies);
    }

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo ficha" });
  }
});

// --- ACTUALIZAR FICHA MÉDICA (PUT) ---
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

    // Ruta 4 - Actualizar
    const encryptedPhone = emergency_contact_phone ? encryptData(emergency_contact_phone) : undefined;
    const encryptedDiseases = chronic_diseases ? encryptData(chronic_diseases) : undefined;
    const encryptedAllergies = allergies ? encryptData(allergies) : undefined;

    const updatePayload = {
        height: parseFloat(height),
        initial_weight: parseFloat(current_weight), 
        emergency_contact_name,
        blood_type
    };

    if (encryptedPhone) updatePayload.emergency_contact_phone = encryptedPhone;
    if (encryptedDiseases) updatePayload.chronic_diseases = encryptedDiseases;
    if (encryptedAllergies) updatePayload.allergies = encryptedAllergies;

    const { data, error } = await supabase
      .from('medical_records')
      .update(updatePayload) 
      .eq('user_id', user_id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.status(200).json({ message: "Perfil actualizado y protegido correctamente", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// --- CONFIGURACIÓN DEL PUERTO ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Microservicio de Usuarios corriendo en puerto ${PORT}`));