import { DriverApi } from './api.mjs';
const $ = id => document.getElementById(id);
const message = text => { $('message').textContent = text; };
function signedOut() {
  $('signin').hidden = false; $('account').hidden = true; $('logout').hidden = true;
  $('profile').reset(); $('email').textContent = ''; $('trucks').replaceChildren();
}
const api = new DriverApi(fetch, () => { signedOut(); message('Your session expired. Please sign in again.'); });
function showProfile(user) {
  $('profile').elements.fullName.value = user.fullName || '';
  $('profile').elements.phone.value = user.phone || '';
  $('email').textContent = user.email || '';
}
async function loadTrucks() {
  const data = await api.trucks(); $('trucks').replaceChildren();
  if (!Array.isArray(data?.items)) throw new Error('Truck profiles could not be read. Please retry.');
  if (!data.items.length) { $('trucks').textContent = 'No saved truck profiles. Add and verify your truck in the Android app.'; return; }
  for (const truck of data.items) {
    const card = document.createElement('article');
    const name = document.createElement('h3'); name.textContent = truck.name || 'Saved truck';
    const info = document.createElement('p'); info.textContent = 'Saved profile — routing acceptance must be verified in the Android app.';
    const specs = document.createElement('p');
    specs.textContent = [['heightFt', 'Height', 'ft'], ['widthFt', 'Width', 'ft'], ['lengthFt', 'Length', 'ft'], ['weightLbs', 'Gross weight', 'lb'], ['axleCount', 'Axles', ''], ['trailerCount', 'Trailers', '']].map(([key, label, unit]) => `${label}: ${typeof truck[key] === 'number' && Number.isFinite(truck[key]) ? `${truck[key]} ${unit}`.trim() : 'Unknown'}`).join(' · ');
    card.append(name, info, specs); $('trucks').append(card);
  }
}
async function action(form, work) {
  const buttons = [...form.querySelectorAll('button')]; buttons.forEach(b => { b.disabled = true; });
  try { await work(); } catch (error) { message(error.message || 'Connection unavailable. Please retry.'); }
  finally { buttons.forEach(b => { b.disabled = false; }); }
}
$('login').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget;
  void action(form, async () => {
    const password = form.elements.password.value; form.elements.password.value = '';
    await api.login(form.elements.email.value, password);
    const user = await api.profile(); showProfile(user);
    $('signin').hidden = true; $('account').hidden = false; $('logout').hidden = false;
    message('Signed in. Account details loaded.'); await loadTrucks();
  });
});
$('profile').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget;
  void action(form, async () => { showProfile(await api.saveProfile(form.elements.fullName.value, form.elements.phone.value)); message('Profile saved to your SemiTraX account.'); });
});
$('refresh').addEventListener('click', () => void action($('refresh').parentElement, async () => { await loadTrucks(); message('Truck profiles refreshed.'); }));
$('logout').addEventListener('click', async () => {
  const pending = api.logout(); signedOut(); message('Signed out on this browser.');
  try { await pending; } catch { message('Signed out locally. Server sign-out could not be confirmed.'); }
});
function network() { $('network').textContent = navigator.onLine ? '' : 'Offline — account actions are unavailable.'; }
addEventListener('online', network); addEventListener('offline', network); network();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
