const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/words', async (req, res) => {
  try {
    const { data, error } = await supabase.from('words').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/words-with-image', upload.single('image'), async (req, res) => {
  try {
    const { word, translation, context, part_of_speech } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('words-images')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (storageError) throw storageError;

    const { data: publicUrlData } = supabase
      .storage
      .from('words-images')
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { data, error } = await supabase
      .from('words')
      .insert([{ word, translation, context, part_of_speech, image_url: imageUrl }]);

    if (error) throw error;

    res.json({ message: 'Guardado con éxito', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor ejecutándose en el puerto ${port}`);
});