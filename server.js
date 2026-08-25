const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { supabase } = require('./supabaseClient.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Crear carpeta temporal si no existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la raíz
app.use(express.static(path.join(__dirname)));

// Ruta principal para servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

    const { data: storageData, error: storageError } = await supabase.storage
      .from('words-images')
      .upload(fileName, fileData, {
        contentType: file.mimetype,
        upsert: true
      });

    fs.unlinkSync(file.path);

    if (storageError) {
      return res.status(500).json({ status: 'Error', message: storageError.message });
    }

    const { data: urlData } = supabase.storage
      .from('words-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const { data, error: dbError } = await supabase
      .from('words')
      .insert([{ word, translation, image_url: imageUrl }])
      .select();

    if (dbError) {
      return res.status(500).json({ status: 'Error', message: dbError.message });
    }

    res.json({ status: 'Exitoso', data });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});