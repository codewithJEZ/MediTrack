const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const authRouter = require('./routes/auth');
const medicinesRouter = require('./routes/medicines');
const categoriesRouter = require('./routes/categories');
const transactionsRouter = require('./routes/transactions');
const usersRouter = require('./routes/users');
const settingsRouter = require('./routes/settings');
const risRouter = require('./routes/ris');
const reportsRouter = require('./routes/reports');

app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.json({ message: 'MediTrack API running' });
});

app.use('/api/medicines', medicinesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ris', risRouter);
app.use('/api/reports', reportsRouter);

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
