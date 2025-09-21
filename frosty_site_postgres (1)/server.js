require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const stripeSdk = require('stripe');
const csvWriter = require('csv-writer').createObjectCsvStringifier;
const db = require('./db_pg');
const { createEvent } = require('./utils/googleCalendar');
const { sendOwnerNewBookingEmail, sendCustomerConfirmation } = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 4242;
const stripe = process.env.STRIPE_SECRET_KEY ? stripeSdk(process.env.STRIPE_SECRET_KEY) : null;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'dev-secret', resave: false, saveUninitialized: true }));

// Init DB & owner admin
db.initDb().then(db.createOwnerIfMissing);

// ------- Public API -------
app.get('/api/availability', async (req, res) => {
  const { date } = req.query;
  if(!date) return res.status(400).json({ error: 'date required as YYYY-MM-DD' });
  const times = await db.dailyBookedTimes(date);
  res.json({ bookedTimes: times });
});

app.post('/api/check-availability', async (req, res) => {
  try {
    const { date, time } = req.body;
    if(!date || !time) return res.status(400).json({ available: false, error: 'date/time required' });
    const conflict = await db.findBookingsBySlot(date, time);
    res.json({ available: !conflict });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/book', async (req, res) => {
  try {
    const { name, email, phone, packageId, date, time, address, guests, notes } = req.body;
    const conflict = await db.findBookingsBySlot(date, time);
    if(conflict) return res.status(400).json({ error: 'Selected slot is not available' });

    const packagePrices = { mini: 10000, cool: 15000, ultimate: 27500 }; // cents
    const amount = packagePrices[packageId] || 10000;

    const bookingId = await db.createBooking({ name, email, phone, packageId, date, time, address, guests, notes, amount, status: 'pending' });
    sendOwnerNewBookingEmail({ id: bookingId, name, email, phone, packageId, date, time, address, guests, notes });

    if(stripe){
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: { currency: 'usd', product_data: { name: `Frosty Fiesta - ${packageId} package` }, unit_amount: amount },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.DOMAIN || 'http://localhost:4242'}/?success=1&booking=${bookingId}`,
        cancel_url: `${process.env.DOMAIN || 'http://localhost:4242'}/?canceled=1&booking=${bookingId}`,
        metadata: { bookingId: bookingId.toString() }
      });
      return res.json({ url: session.url, bookingId });
    } else {
      return res.json({ url: null, bookingId, message: 'Stripe not configured. Booking saved as pending.' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Stripe webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if(!stripe) return res.json({ received: true });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('webhook signature error', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata.bookingId;
    try {
      await db.markBookingStatus(bookingId, 'paid');
      const booking = await db.getBooking(bookingId);
      try { const evtId = await createEvent(booking); await db.setBookingCalendarEvent(bookingId, evtId); } catch {}
      try { await sendCustomerConfirmation(booking); } catch {}
    } catch (e) { console.error('post-payment actions failed', e); }
  }
  res.json({ received: true });
});

// Reviews
app.post('/api/review', async (req, res) => {
  try {
    const { name, rating, text } = req.body;
    await db.createReview({ name, rating: Number(rating), text, date: new Date().toISOString() });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save review' });
  }
});
app.get('/api/reviews', async (req, res) => res.json(await db.getReviews()));

// Admin API
function requireAdmin(req, res, next){ if(!req.session.admin) return res.status(401).json({ error: 'unauthorized' }); next(); }
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.verifyAdmin(username, password);
  if(user){ req.session.admin = user; res.json({ ok: true, user }); } else res.status(401).json({ error: 'invalid' });
});
app.post('/api/admin/logout', (req, res) => { req.session.destroy(()=>res.json({ ok: true })); });
app.get('/api/admin/bookings', requireAdmin, async (req, res) => res.json(await db.getBookings()));

app.listen(PORT, () => console.log('Server running on port', PORT));
