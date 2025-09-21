// generate hourly slots (10:00–18:00)
function generateSlots(){
  const slots = [];
  for(let h=10; h<=18; h++){ const hh = String(h).padStart(2,'0'); slots.push(`${hh}:00`); }
  return slots;
}
document.addEventListener('DOMContentLoaded', () => {
  const pkgButtons = document.querySelectorAll('.pkg');
  const packageInput = document.querySelector('input[name="packageId"]');
  const timeSelect = document.getElementById('timeSelect');
  const dateInput = document.getElementById('dateInput');
  pkgButtons.forEach(b => b.addEventListener('click', () => { packageInput.value = b.dataset.id; pkgButtons.forEach(x=>x.style.opacity=0.6); b.style.opacity = 1; }));
  pkgButtons[0].click();
  function fillSlots(disabledTimes){ const slots = generateSlots(); timeSelect.innerHTML=''; slots.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=disabledTimes?.includes(t)?`${t} (booked)`:t; if(disabledTimes?.includes(t)) o.disabled=true; timeSelect.appendChild(o); }); }
  fillSlots([]);
  dateInput.addEventListener('change', async ()=>{ if(!dateInput.value) return; const res=await fetch('/api/availability?date='+encodeURIComponent(dateInput.value)); const j=await res.json(); fillSlots(j.bookedTimes||[]);} );
  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.guests = Number(data.guests) || 20;
    const resp = await fetch('/api/book', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const json = await resp.json();
    if(json.url) window.location.href = json.url;
    else if(json.bookingId) document.getElementById('bookingMsg').innerText = 'Booking saved (Stripe not configured). Booking ID: '+json.bookingId;
    else document.getElementById('bookingMsg').innerText = json.error || 'Error';
  });
  async function loadReviews(){ const res = await fetch('/api/reviews'); const list = await res.json(); document.getElementById('reviewsList').innerHTML = list.map(r=>`<div class="review"><strong>${r.name}</strong> — ${r.rating}/5<br>${r.text}</div>`).join(''); }
  loadReviews();
  document.getElementById('reviewForm').addEventListener('submit', async (e)=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries()); const res=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); if(res.ok){ loadReviews(); e.target.reset(); alert('Thanks for the review!'); } });
  document.getElementById('contactForm').addEventListener('submit', async (e)=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.target).entries()); const res=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); const j=await res.json(); document.getElementById('contactMsg').innerText = j.ok?'Message sent!':(j.error||'Failed to send'); });
});
