const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static('public'));

// Variables de entorno de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware para verificar el Token del Usuario
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Sesión inválida o expirada.' });

  req.user = user; // Guarda los datos del usuario logueado en la petición
  next();
}

// 1. Obtener palabras del usuario activo
app.get('/api/words', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Subir palabra e imagen vinculadas al usuario activo
app.post('/api/words-with-image', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { word, translation, context, part_of_speech } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'La imagen es requerida.' });

    // Nombrar la imagen dentro del bucket
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${req.user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('vocab-images')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: publicUrlData } = supabase
      .storage
      .from('vocab-images')
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    // Insertar en la base de datos con el ID del usuario
    const { data, error } = await supabase
      .from('words')
      .insert([
        {
          word,
          translation,
          context,
          part_of_speech,
          image_url: imageUrl,
          user_id: req.user.id // <-- AQUÍ SE VINCULA AL USUARIO
        }
      ]);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Eliminar palabra
app.delete('/api/words/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));