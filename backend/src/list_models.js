require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }
  
  try {
    let url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    while (url) {
      const res = await fetch(url);
      const data = await res.json();
      if (data.models) {
        const textModels = data.models
          .filter(m => m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name);
        console.log('Text Models page:', textModels);
      }
      if (data.nextPageToken) {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageToken=${data.nextPageToken}`;
      } else {
        url = null;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

listModels();
