const nodemailer = require('nodemailer');
function getTransport(){
  if(!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
}
async function sendOwnerNewBookingEmail(booking){
  const t = getTransport();
  if(!t) return;
  const to = process.env.EMAIL_USER;
  const subject = `New booking: #${booking.id} — ${booking.name}`;
  const text = `Package: ${booking.packageId}\nDate: ${booking.date} ${booking.time}\nGuests: ${booking.guests}\nAddress: ${booking.address}\nNotes: ${booking.notes||''}`;
  await t.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
}
async function sendCustomerConfirmation(booking){
  const t = getTransport();
  if(!t || !booking.email) return;
  const subject = `Frosty Fiesta Confirmation — Booking #${booking.id}`;
  const text = `Hi ${booking.name},\n\nThanks for booking Frosty Fiesta!\n\nDetails:\n- Package: ${booking.packageId}\n- Date: ${booking.date} ${booking.time}\n- Guests: ${booking.guests}\n- Address: ${booking.address}\n\nWe’ll see you soon!`;
  await t.sendMail({ from: process.env.EMAIL_USER, to: booking.email, subject, text });
}
module.exports = { sendOwnerNewBookingEmail, sendCustomerConfirmation };
