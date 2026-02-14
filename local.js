require('dotenv').config();

const app = require('.');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running locally at http://localhost:${PORT}`);
});
