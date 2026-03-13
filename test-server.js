const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});
