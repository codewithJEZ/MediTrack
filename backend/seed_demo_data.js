// seed_demo_data.js
// MediTrack Demo Data Generator
// Run: node seed_demo_data.js

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

const STAFF_USERS = [
  { name: 'Staff 1', username: 'staff1' },
  { name: 'Staff 2', username: 'staff2' }
];

const MEDICINES = [
  'Paracetamol','Biogesic','Neozep','Cetirizine','Amoxicillin',
  'Co-Amoxiclav','Ibuprofen','Mefenamic Acid','Lagundi Syrup',
  'Ascof','Solmux','Diatabs','Kremil-S','Tuseran','Bioflu',
  'ORS','Vitamin C','Multivitamins','Salbutamol','Betadine',
  'Alcohol','Cotton Balls','Gauze Pads','Bandage','Face Mask',
  'Antibiotic Ointment','Hydrogen Peroxide','Loperamide',
  'Carbocisteine','Ambroxol','Cetaphil Lotion','Calamine Lotion',
  'Mupirocin','Clotrimazole','Zinc Oxide','Aspirin',
  'Losartan','Amlodipine','Metformin','Omeprazole',
  'Ranitidine','Loratadine','Phenylephrine','Naproxen',
  'Diclofenac','Methyl Salicylate','Insulin Syringe',
  'Thermometer','Gloves','Disposable Syringe','Masking Tape',
  'Micropore Tape','Povidone Iodine','Nasal Spray',
  'Eye Drops','Antacid','Vitamin B Complex'
];

const PATIENT_NAMES = [
  'John Cruz','Maria Santos','Carlo Reyes','Angela Dela Cruz','Mark Bautista',
  'Jasmine Flores','Patrick Mendoza','Nicole Garcia','Joshua Ramos','Alyssa Villanueva',
  'Luis Aquino','Carla Navarro','Raymond Torres','Diana Lim','Christian Ocampo',
  'Sophia Castillo','Emmanuel Pascual','Rina Espino','Aaron Dela Torre','Mia Evangelista',
  'Miguel Soriano','Hannah Cabrera','Jerome Macapagal','Trisha Umali','Ian Legaspi',
  'Bianca Robles','Felix Andrade','Christine Belen','Roel Magpantay','Jenny Encarnacion'
];

const ILLNESSES = [
  'Headache','Fever','Flu','Cough','Cold','Toothache',
  'Hyperacidity','Allergy','Asthma','Diarrhea','Dysmenorrhea',
  'Hypertension','Skin Rash','Sore Throat','Stomachache','Wound'
];

const COURSES = [
  'BSIT','BSCS','BSBA','BSN','BSED','BSEE','BSME','BS Psychology',
  'AB Communication','BS Criminology','BSHRM','BSA'
];

const SECTIONS = ['1A','1B','2A','2B','3A','3B','4A','4B'];

const CATEGORIES = [
  'Analgesics',
  'Antibiotics',
  'Antihistamines',
  'Respiratory',
  'Vitamins',
  'Gastrointestinal',
  'First Aid',
  'Medical Supplies'
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithin2Months() {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - 2);

  return new Date(
    past.getTime() + Math.random() * (now.getTime() - past.getTime())
  );
}

function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

console.log('🚀 Starting MediTrack demo data generation...');

db.prepare(`
  DELETE FROM transactions
`).run();

db.prepare(`
  DELETE FROM ris_items
`).run();

db.prepare(`
  DELETE FROM ris_requests
`).run();

db.prepare(`
  DELETE FROM medicines
`).run();

db.prepare(`
  DELETE FROM categories
`).run();

db.prepare(`
  DELETE FROM users
  WHERE role != 'admin'
`).run();

console.log('✅ Old demo data cleared');

// Categories
const insertCategory = db.prepare(`
  INSERT INTO categories (name)
  VALUES (?)
`);

const categoryIds = [];

for (const cat of CATEGORIES) {
  const result = insertCategory.run(cat);
  categoryIds.push(result.lastInsertRowid);
}

console.log('✅ Categories generated');

// Staff Users
const insertUser = db.prepare(`
  INSERT INTO users (name, username, password, role)
  VALUES (?, ?, ?, ?)
`);

for (const staff of STAFF_USERS) {
  insertUser.run(
    staff.name,
    staff.username,
    'meditrack@2026',
    'staff'
  );
}

console.log('✅ Staff users created');

// Fetch staff IDs
const staffUsers = db.prepare(`
  SELECT * FROM users WHERE role='staff'
`).all();

// Medicines
const insertMedicine = db.prepare(`
  INSERT INTO medicines
  (
    name,
    category_id,
    quantity,
    unit,
    expiration_date
  )
  VALUES (?, ?, ?, ?, ?)
`);

const medicineIds = [];

for (const med of MEDICINES) {
  let qty = rand(10, 300);

  if (Math.random() < 0.12) {
    qty = rand(1, 5); // low stock
  }

  let expiry;

  if (Math.random() < 0.05) {
    expiry = futureDate(-rand(1, 30)); // expired
  } else if (Math.random() < 0.15) {
    expiry = futureDate(rand(1, 25)); // expiring soon
  } else {
    expiry = futureDate(rand(60, 500));
  }

  const result = insertMedicine.run(
    med,
    randomItem(categoryIds),
    qty,
    'pcs',
    expiry
  );

  medicineIds.push(result.lastInsertRowid);
}

console.log('✅ Medicines generated');

// Transactions
const insertTransaction = db.prepare(`
  INSERT INTO transactions
  (
    medicine_id,
    type,
    quantity,
    performed_by_name,
    user_id,
    patient_name,
    course,
    section,
    illness,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < 700; i++) {
  const staff = randomItem(staffUsers);
  const type = Math.random() < 0.72 ? 'out' : 'in';

  let patient_name, course, section, illness;

  if (type === 'out') {
    patient_name = randomItem(PATIENT_NAMES);
    course       = randomItem(COURSES);
    section      = randomItem(SECTIONS);
    illness      = randomItem(ILLNESSES);
  } else {
    patient_name = 'Restock';
    course       = null;
    section      = null;
    illness      = '—';
  }

  insertTransaction.run(
    randomItem(medicineIds),
    type,
    type === 'out' ? rand(1, 15) : rand(20, 100),
    staff.name,
    staff.id,
    patient_name,
    course,
    section,
    illness,
    randomDateWithin2Months().toISOString()
  );
}

console.log('✅ Transactions generated');

// RIS
const insertRIS = db.prepare(`
  INSERT INTO ris_requests
  (
    requested_by,
    status,
    created_at
  )
  VALUES (?, ?, ?)
`);

const insertRISItem = db.prepare(`
  INSERT INTO ris_items
  (
    ris_id,
    medicine_id,
    quantity
  )
  VALUES (?, ?, ?)
`);

const risStatuses = [
  'pending',
  'approved',
  'delivered',
  'rejected'
];

for (let i = 0; i < 80; i++) {
  const staff = randomItem(staffUsers);

  const ris = insertRIS.run(
    staff.name,
    randomItem(risStatuses),
    randomDateWithin2Months().toISOString()
  );

  const risId = ris.lastInsertRowid;

  const itemCount = rand(1, 5);

  for (let x = 0; x < itemCount; x++) {
    insertRISItem.run(
      risId,
      randomItem(medicineIds),
      rand(1, 20)
    );
  }
}

console.log('✅ RIS requests generated');

console.log('🎉 MediTrack demo data completed successfully!');
console.log('👤 Staff accounts:');
console.log('   staff1 / meditrack@2026');
console.log('   staff2 / meditrack@2026');