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

app.get('/', (req, res) => {
  res.json({ message: 'MediTrack API running' });
});

app.use('/api/auth', authRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ris', risRouter);

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
