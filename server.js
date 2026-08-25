const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const { supabase } = require('./supabaseClient.js');

const app = express();

// Crear carpeta temporal si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ruta de prueba GET
app.get('/test-db', async (req, res) => {
  const { data, error } = await supabase.from('words').select('*');
  if (error) return res.status(500).json({ status: 'Error', message: error.message });
  res.json({ status: 'Exitoso', data });
});

// Ruta POST para recibir formulario con imagen
app.post('/api/words-with-image', upload.single('image'), async (req, res) => {
  try {
    const { word, translation } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ status: 'Error', message: 'Falta la imagen' });
    }

    const fileData = fs.readFileSync(file.path);
    const fileName = `${Date.now()}_${file.originalname}`;

    // Subir imagen a Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('words-images')
      .upload(fileName, fileData, { contentType: file.mimetype });

    // Borrar archivo local temporal
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    if (storageError) {
      console.error('Error en Supabase Storage:', storageError);
      return res.status(500).json({ status: 'Error', message: storageError.message });
    }

    // Obtener URL pública de la imagen
    const { data: urlData } = supabase.storage
      .from('words-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Guardar registro en la base de datos
    const { data, error: dbError } = await supabase
      .from('words')
      .insert([{ word, translation, image_url: imageUrl }])
      .select();

    if (dbError) {
      console.error('Error en DB:', dbError);
      return res.status(500).json({ status: 'Error', message: dbError.message });
    }

    res.json({ status: 'Exitoso', data });
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});