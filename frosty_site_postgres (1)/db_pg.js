const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: false }
});

async function initDb(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      name TEXT, email TEXT, phone TEXT, packageId TEXT,
      date DATE, time TEXT, address TEXT, guests INTEGER, notes TEXT,
      amount INTEGER, status TEXT, created_at TIMESTAMP DEFAULT NOW(),
      gcal_event_id TEXT
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      name TEXT, rating INTEGER, text TEXT, date TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE, password TEXT, email TEXT, role TEXT DEFAULT 'admin'
    );
  `);
}

async function createOwnerIfMissing(){
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM admins');
  if (rows[0].c === 0){
    const user = process.env.ADMIN_USER || 'owner';
    const pass = process.env.ADMIN_PASSWORD || 'change_me';
    const email = process.env.ADMIN_EMAIL || '';
    const hash = await bcrypt.hash(pass, 10);
    await pool.query('INSERT INTO admins (username,password,email,role) VALUES ($1,$2,$3,$4)', [user, hash, email, 'owner']);
    console.log('Created initial owner admin:', user);
  }
}

async function verifyAdmin(username, password){
  const { rows } = await pool.query('SELECT * FROM admins WHERE username=$1', [username]);
  const row = rows[0];
  if(!row) return null;
  const ok = await bcrypt.compare(password, row.password);
  return ok ? { id: row.id, username: row.username, role: row.role, email: row.email } : null;
}

async function addAdmin(username, password, email, role='admin'){
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO admins (username,password,email,role) VALUES ($1,$2,$3,$4)', [username, hash, email, role]);
}

async function listAdmins(){
  const { rows } = await pool.query('SELECT id, username, email, role FROM admins ORDER BY id DESC');
  return rows;
}

async function deleteAdmin(id){
  await pool.query("DELETE FROM admins WHERE id=$1 AND role != 'owner'", [id]);
}

async function createBooking(obj){
  const { rows } = await pool.query(
    `INSERT INTO bookings (name,email,phone,packageId,date,time,address,guests,notes,amount,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [obj.name, obj.email, obj.phone, obj.packageId, obj.date, obj.time, obj.address, obj.guests, obj.notes, obj.amount, obj.status]
  );
  return rows[0].id;
}

async function markBookingStatus(id, status){
  await pool.query('UPDATE bookings SET status=$1 WHERE id=$2', [status, id]);
}

async function setBookingCalendarEvent(id, eventId){
  await pool.query('UPDATE bookings SET gcal_event_id=$1 WHERE id=$2', [eventId, id]);
}

async function getBookings(){
  const { rows } = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
  return rows;
}

async function getBooking(id){
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id=$1', [id]);
  return rows[0];
}

async function findBookingsBySlot(date, time){
  const { rows } = await pool.query(
    "SELECT 1 FROM bookings WHERE date=$1 AND time=$2 AND status IN ('pending','paid') LIMIT 1",
    [date, time]
  );
  return rows.length > 0;
}

async function dailyBookedTimes(date){
  const { rows } = await pool.query(
    "SELECT time FROM bookings WHERE date=$1 AND status IN ('pending','paid')",
    [date]
  );
  return rows.map(r => r.time);
}

async function createReview({name,rating,text,date}){
  await pool.query('INSERT INTO reviews (name, rating, text, date) VALUES ($1,$2,$3,$4)', [name, rating, text, date]);
}

async function getReviews(){
  const { rows } = await pool.query('SELECT * FROM reviews ORDER BY id DESC LIMIT 50');
  return rows;
}

module.exports = {
  initDb, createOwnerIfMissing, verifyAdmin, addAdmin, listAdmins, deleteAdmin,
  createBooking, markBookingStatus, setBookingCalendarEvent, getBookings, getBooking,
  findBookingsBySlot, dailyBookedTimes, createReview, getReviews
};
