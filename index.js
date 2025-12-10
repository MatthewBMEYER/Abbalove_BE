const express = require('express');
const cors = require('cors');
const http = require("http");
const bodyParser = require('body-parser');
require('dotenv').config();

console.log('ENV Verification:', {
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    DB_PASS: process.env.DB_PASS ? '*****' : 'undefined'
});

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

// Import middlewares
const { verifyToken } = require('./middlewares/authMiddleware');

// Import routes
const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoute');
const teamRoutes = require('./routes/teamRoute');
const comcellRoutes = require('./routes/comcellRoute');
const eventRoutes = require('./routes/eventRoute');
const videoRoutes = require('./routes/videoRoute');
const coreEventRoutes = require('./routes/coreEventRoute');



// Routes
app.use('/auth', authRoutes);
app.use('/user', verifyToken, userRoutes);
app.use('/team', verifyToken, teamRoutes);
app.use('/comcell', verifyToken, comcellRoutes);
app.use('/events', verifyToken, eventRoutes);
app.use('/core/event', verifyToken, coreEventRoutes);
app.use('/videos', verifyToken, videoRoutes);


const PORT = process.env.PORT || 801;
app.listen(PORT, () => {
    console.log(`The Service running well... at http://localhost:${PORT}`);
});
