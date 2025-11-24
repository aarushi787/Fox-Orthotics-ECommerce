require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
const admin = require("./firebase"); // keep this (initializes Admin SDK if present)

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const imagesRoutes = require('./routes/images');

const app = express();

/* ----------------------------------------------
   STATIC IMAGES FOLDER (LOCAL IMAGES)
   Use IMAGES_DIR_PATH env var or default ../images
------------------------------------------------ */
const IMAGES_DIR = process.env.IMAGES_DIR_PATH || path.join(__dirname, '..', '..', 'images');
app.use('/images', express.static(IMAGES_DIR));

/* ----------------------------------------------
   MIDDLEWARE
------------------------------------------------ */
app.use(cors());
app.use(express.json());

/* ----------------------------------------------
   HEALTH CHECK
------------------------------------------------ */
app.get('/api/health', (req, res) => res.json({ status: 'Server is running' }));

/* ----------------------------------------------
   API ROUTES
------------------------------------------------ */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/images', imagesRoutes);

/* ----------------------------------------------
   SWAGGER
------------------------------------------------ */
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/* ----------------------------------------------
   ERROR HANDLER
------------------------------------------------ */
app.use(errorHandler);

/* ----------------------------------------------
   START SERVER
------------------------------------------------ */
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Images folder: ${IMAGES_DIR}`);
});
