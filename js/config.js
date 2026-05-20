const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API = isLocal
  ? 'http://localhost:3000/api'
  : 'https://REPLACE_LATER_WITH_RAILWAY_URL/api';
