// Helsinki Live — harjoitustyö
// Firebase Auth + Firestore + Helsinki Linkedevents REST API

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Firebase config ──────────────────────────────────────────────
// Web API keys are public by design; Firestore rules enforce security.
const firebaseConfig = {
  apiKey: 'AIzaSyDQxO8BQGWzweoyB13iRq3IiBt2Xr-G060',
  authDomain: 'vite-cloud-b804e.firebaseapp.com',
  projectId: 'vite-cloud-b804e',
  storageBucket: 'vite-cloud-b804e.firebasestorage.app',
  messagingSenderId: '462899923958',
  appId: '1:462899923958:web:f4ea050daace5ecbb4d5d7',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Linkedevents service (plain JS port of the React Native version) ───
const API_BASE = 'https://api.hel.fi/linkedevents/v1';

// Two-phase scan constants — identical to the mobile app
const DISPLAY_SIZE = 30;
const SCAN_PAGE_SIZE = 100;
const SCAN_BATCH = 5;
const MAX_SCAN_ROUNDS = 20;

function getLocalizedText(obj, lang = 'fi') {
  if (!obj) return '';
  return obj[lang] || obj.fi || obj.en || obj.sv || '';
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPlaceId(location) {
  if (!location) return undefined;
  if (location.id) return location.id;
  if (location['@id']) {
    const match = location['@id'].match(/\/place\/([^/]+)\/?$/);
    return match?.[1];
  }
  return undefined;
}

async function getPlaceDetails(placeId) {
  try {
    const r = await fetch(`${API_BASE}/place/${placeId}/`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function normalizeEvent(raw, place) {
  const start = new Date(raw.start_time);
  const end = raw.end_time ? new Date(raw.end_time) : start;
  const now = new Date();
  return {
    id: raw.id,
    title: getLocalizedText(raw.name) || 'Nimetön tapahtuma',
    description: stripHtml(
      getLocalizedText(raw.description) || getLocalizedText(raw.short_description)
    ),
    startTime: start,
    endTime: end,
    location: {
      name: place?.name
        ? getLocalizedText(place.name)
        : getLocalizedText(raw.location_extra_info) || 'Sijainti tuntematon',
      address: place?.address ? getLocalizedText(place.address) : '',
    },
    image: raw.images?.[0]?.url,
    imageAlt: raw.images?.[0]?.alt_text || '',
    isOngoing: start <= now && now <= end,
    isCancelled: raw.event_status === 'EventCancelled',
    infoUrl: getLocalizedText(raw.info_url, 'fi') || getLocalizedText(raw.info_url, 'en') || null,
  };
}

function buildEventParams({ search, end, page, pageSize }) {
  const params = new URLSearchParams();
  if (search) params.append('text', search);
  if (end) params.append('end', end);
  params.append('start', 'now');
  params.append('sort', 'start_time');
  params.append('page_size', String(pageSize || 20));
  if (page) params.append('page', String(page));
  return params;
}

async function fetchRawEventsPage(filters) {
  try {
    const params = buildEventParams(filters);
    const r = await fetch(`${API_BASE}/event/?${params}`);
    if (r.status === 404) return { events: [], hasNext: false };
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data.data)) return { events: [], hasNext: false };
    return { events: data.data, hasNext: Boolean(data.meta?.next) };
  } catch (e) {
    console.error('fetchRawEventsPage failed:', e);
    return { events: [], hasNext: false };
  }
}

async function enrichWithPlaces(rawEvents) {
  return Promise.all(
    rawEvents.map(async (raw) => {
      let place;
      const placeId = extractPlaceId(raw.location);
      if (placeId) place = (await getPlaceDetails(placeId)) || undefined;
      return normalizeEvent(raw, place);
    })
  );
}

/**
 * Two-phase scan:
 *  1) Fast parallel raw scan, filter client-side to skip the ~2400 permanent
 *     fixture events (start=2001, end=2050) at the front of the API sort.
 *  2) Place lookups only for the DISPLAY_SIZE events we'll actually show.
 *
 * Returns { events, nextScanPage, hasMore }.
 */
async function scanForEvents({ search, startScanPage = 1 }) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = (() => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();

  const isRelevant = (raw) =>
    raw.event_status !== 'EventCancelled' &&
    new Date(raw.start_time) >= startOfToday;

  const relevantRaw = [];
  let scanPage = startScanPage;
  let apiHasMore = true;

  for (
    let round = 0;
    round < MAX_SCAN_ROUNDS && apiHasMore && relevantRaw.length < DISPLAY_SIZE;
    round++
  ) {
    const pageNums = Array.from({ length: SCAN_BATCH }, (_, i) => scanPage + i);
    const results = await Promise.all(
      pageNums.map((p) =>
        fetchRawEventsPage({
          search,
          end: endDate,
          page: p,
          pageSize: SCAN_PAGE_SIZE,
        })
      )
    );
    scanPage += SCAN_BATCH;
    for (const r of results) {
      relevantRaw.push(...r.events.filter(isRelevant));
      if (!r.hasNext) {
        apiHasMore = false;
        break;
      }
    }
  }

  const toDisplay = relevantRaw.slice(0, DISPLAY_SIZE);
  const enriched = await enrichWithPlaces(toDisplay);
  return {
    events: enriched,
    nextScanPage: apiHasMore ? scanPage : scanPage - SCAN_BATCH,
    hasMore: apiHasMore && enriched.length > 0,
  };
}

// ── App state ────────────────────────────────────────────────────
const state = {
  view: 'events',
  events: [],
  favoriteIds: new Set(),
  favoriteEvents: [], // hydrated event objects for the favorites view
  scanPage: 1,
  hasMore: true,
  loading: false,
  searchQuery: '',
  user: null,
};

// ── DOM ─────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  authStatus: $('auth-status'),
  openLogin: $('open-login'),
  logout: $('logout'),
  navEvents: $('nav-events'),
  navFavorites: $('nav-favorites'),
  eventsView: $('events-view'),
  favoritesView: $('favorites-view'),
  eventsStatus: $('events-status'),
  eventsList: $('events-list'),
  loadMore: $('load-more'),
  favoritesStatus: $('favorites-status'),
  favoritesList: $('favorites-list'),
  searchInput: $('search-input'),
  loginDialog: $('login-dialog'),
  loginForm: $('login-form'),
  loginEmail: $('login-email'),
  loginPassword: $('login-password'),
  loginError: $('login-error'),
  loginCancel: $('login-cancel'),
  loginSubmit: $('login-submit'),
  signupSubmit: $('signup-submit'),
};

// ── Render helpers ───────────────────────────────────────────────
const DATE_FMT = new Intl.DateTimeFormat('fi-FI', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(d) {
  try {
    return DATE_FMT.format(d);
  } catch {
    return '';
  }
}

function renderEventCard(ev) {
  const li = document.createElement('li');
  li.className = 'event-card';

  if (ev.image) {
    const media = document.createElement('div');
    media.className = 'event-card__media';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = ev.image;
    img.alt = ev.imageAlt || '';
    media.appendChild(img);
    li.appendChild(media);
  } else {
    const media = document.createElement('div');
    media.className = 'event-card__media';
    media.setAttribute('aria-hidden', 'true');
    li.appendChild(media);
  }

  const body = document.createElement('div');
  body.className = 'event-card__body';

  const date = document.createElement('span');
  date.className = 'event-card__date';
  date.textContent = formatDate(ev.startTime);
  body.appendChild(date);

  const title = document.createElement('h3');
  title.className = 'event-card__title';
  title.textContent = ev.title;
  body.appendChild(title);

  const venue = document.createElement('span');
  venue.className = 'event-card__venue';
  venue.textContent = ev.location.name;
  body.appendChild(venue);

  li.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'event-card__footer';

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'fav-btn';
  const isFav = state.favoriteIds.has(ev.id);
  favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
  favBtn.setAttribute('aria-label', isFav ? 'Poista suosikeista' : 'Lisää suosikkeihin');
  favBtn.innerHTML = `<span aria-hidden="true">${isFav ? '♥' : '♡'}</span><span>${isFav ? 'Tallennettu' : 'Tallenna'}</span>`;
  favBtn.addEventListener('click', () => toggleFavorite(ev, favBtn));
  footer.appendChild(favBtn);

  if (ev.infoUrl) {
    const link = document.createElement('a');
    link.className = 'event-card__link';
    link.href = ev.infoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Lue lisää →';
    footer.appendChild(link);
  }

  li.appendChild(footer);
  return li;
}

function renderEventsList(list, container) {
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach((ev) => frag.appendChild(renderEventCard(ev)));
  container.appendChild(frag);
}

// ── View switching ───────────────────────────────────────────────
function setView(view) {
  state.view = view;
  const showEvents = view === 'events';
  els.eventsView.hidden = !showEvents;
  els.favoritesView.hidden = showEvents;

  els.navEvents.classList.toggle('navbtn--active', showEvents);
  els.navFavorites.classList.toggle('navbtn--active', !showEvents);
  els.navEvents.setAttribute('aria-current', showEvents ? 'page' : 'false');
  els.navFavorites.setAttribute('aria-current', !showEvents ? 'page' : 'false');

  if (!showEvents) renderFavoritesView();
}

// ── Events loading ───────────────────────────────────────────────
async function loadEvents({ reset = true } = {}) {
  if (state.loading) return;
  state.loading = true;

  if (reset) {
    state.scanPage = 1;
    state.events = [];
    els.eventsList.innerHTML = '';
    els.loadMore.hidden = true;
    els.eventsStatus.textContent = 'Ladataan tapahtumia…';
    els.eventsStatus.removeAttribute('data-state');
  } else {
    els.loadMore.disabled = true;
    els.loadMore.textContent = 'Ladataan…';
  }

  try {
    const result = await scanForEvents({
      search: state.searchQuery || undefined,
      startScanPage: state.scanPage,
    });

    // De-duplicate when appending
    const seen = new Set(state.events.map((e) => e.id));
    const fresh = result.events.filter((e) => !seen.has(e.id));
    state.events = reset ? result.events : state.events.concat(fresh);
    state.scanPage = result.nextScanPage;
    state.hasMore = result.hasMore;

    renderEventsList(state.events, els.eventsList);

    if (state.events.length === 0) {
      els.eventsStatus.textContent = state.searchQuery
        ? `Ei tuloksia haulla "${state.searchQuery}".`
        : 'Ei tapahtumia.';
    } else {
      els.eventsStatus.textContent = `${state.events.length} tapahtumaa.`;
    }
    els.loadMore.hidden = !state.hasMore;
  } catch (e) {
    console.error(e);
    els.eventsStatus.textContent = 'Tapahtumien lataus epäonnistui.';
    els.eventsStatus.setAttribute('data-state', 'error');
  } finally {
    state.loading = false;
    els.loadMore.disabled = false;
    els.loadMore.textContent = 'Lataa lisää';
  }
}

// ── Favorites (Firestore) ────────────────────────────────────────
function favoritesDoc(uid) {
  return doc(db, 'favorites', uid);
}

async function loadFavorites(uid) {
  try {
    const snap = await getDoc(favoritesDoc(uid));
    const ids = snap.exists() ? snap.data().eventIds || [] : [];
    state.favoriteIds = new Set(ids);
  } catch (e) {
    console.error('loadFavorites failed:', e);
    state.favoriteIds = new Set();
  }
}

async function saveFavorites(uid) {
  await setDoc(
    favoritesDoc(uid),
    { eventIds: Array.from(state.favoriteIds), updatedAt: Date.now() },
    { merge: true }
  );
}

async function toggleFavorite(ev, btn) {
  if (!state.user) {
    openLoginDialog('Kirjaudu sisään tallentaaksesi suosikit.');
    return;
  }
  const wasFav = state.favoriteIds.has(ev.id);
  if (wasFav) {
    state.favoriteIds.delete(ev.id);
  } else {
    state.favoriteIds.add(ev.id);
  }
  btn.setAttribute('aria-pressed', wasFav ? 'false' : 'true');
  btn.setAttribute('aria-label', wasFav ? 'Lisää suosikkeihin' : 'Poista suosikeista');
  btn.innerHTML = `<span aria-hidden="true">${wasFav ? '♡' : '♥'}</span><span>${wasFav ? 'Tallenna' : 'Tallennettu'}</span>`;

  try {
    await saveFavorites(state.user.uid);
  } catch (e) {
    console.error('saveFavorites failed:', e);
    // Roll back UI
    if (wasFav) state.favoriteIds.add(ev.id);
    else state.favoriteIds.delete(ev.id);
    btn.setAttribute('aria-pressed', wasFav ? 'true' : 'false');
    btn.innerHTML = `<span aria-hidden="true">${wasFav ? '♥' : '♡'}</span><span>${wasFav ? 'Tallennettu' : 'Tallenna'}</span>`;
    els.eventsStatus.textContent = 'Suosikin tallennus epäonnistui.';
    els.eventsStatus.setAttribute('data-state', 'error');
  }
}

async function renderFavoritesView() {
  if (!state.user) {
    els.favoritesStatus.textContent = 'Kirjaudu sisään nähdäksesi tallennetut suosikit.';
    els.favoritesList.innerHTML = '';
    return;
  }
  if (state.favoriteIds.size === 0) {
    els.favoritesStatus.textContent = 'Ei tallennettuja suosikkeja vielä.';
    els.favoritesList.innerHTML = '';
    return;
  }

  els.favoritesStatus.textContent = 'Ladataan suosikkeja…';

  try {
    // Hydrate each favorite by fetching the event directly
    const results = await Promise.all(
      Array.from(state.favoriteIds).map(async (id) => {
        try {
          const r = await fetch(`${API_BASE}/event/${id}/`);
          if (!r.ok) return null;
          const raw = await r.json();
          let place;
          const placeId = extractPlaceId(raw.location);
          if (placeId) place = (await getPlaceDetails(placeId)) || undefined;
          return normalizeEvent(raw, place);
        } catch {
          return null;
        }
      })
    );
    state.favoriteEvents = results.filter(Boolean);

    if (state.favoriteEvents.length === 0) {
      els.favoritesStatus.textContent =
        'Tallennettuja tapahtumia ei löytynyt (ne ovat ehkä jo päättyneet).';
    } else {
      els.favoritesStatus.textContent = `${state.favoriteEvents.length} suosikkia.`;
    }
    renderEventsList(state.favoriteEvents, els.favoritesList);
  } catch (e) {
    console.error(e);
    els.favoritesStatus.textContent = 'Suosikkien lataus epäonnistui.';
    els.favoritesStatus.setAttribute('data-state', 'error');
  }
}

// ── Auth UI ──────────────────────────────────────────────────────
function openLoginDialog(msg) {
  els.loginError.hidden = !msg;
  els.loginError.textContent = msg || '';
  els.loginEmail.value = '';
  els.loginPassword.value = '';
  if (typeof els.loginDialog.showModal === 'function') {
    els.loginDialog.showModal();
  } else {
    els.loginDialog.setAttribute('open', '');
  }
}

function closeLoginDialog() {
  if (typeof els.loginDialog.close === 'function') els.loginDialog.close();
  else els.loginDialog.removeAttribute('open');
}

function showAuthError(e) {
  const code = e?.code || '';
  const map = {
    'auth/invalid-credential': 'Virheellinen sähköposti tai salasana.',
    'auth/invalid-email': 'Virheellinen sähköpostiosoite.',
    'auth/user-not-found': 'Käyttäjää ei löytynyt.',
    'auth/wrong-password': 'Väärä salasana.',
    'auth/email-already-in-use': 'Sähköposti on jo käytössä.',
    'auth/weak-password': 'Salasana on liian heikko (min. 6 merkkiä).',
    'auth/network-request-failed': 'Verkkovirhe — tarkista yhteys.',
  };
  els.loginError.textContent = map[code] || `Kirjautuminen epäonnistui (${code || 'tuntematon virhe'}).`;
  els.loginError.hidden = false;
}

async function handleLogin(ev) {
  ev.preventDefault();
  els.loginError.hidden = true;
  els.loginSubmit.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value);
    closeLoginDialog();
  } catch (e) {
    showAuthError(e);
  } finally {
    els.loginSubmit.disabled = false;
  }
}

async function handleSignup() {
  els.loginError.hidden = true;
  if (!els.loginEmail.value.trim() || els.loginPassword.value.length < 6) {
    els.loginError.textContent = 'Anna sähköposti ja vähintään 6 merkin salasana.';
    els.loginError.hidden = false;
    return;
  }
  els.signupSubmit.disabled = true;
  try {
    await createUserWithEmailAndPassword(auth, els.loginEmail.value.trim(), els.loginPassword.value);
    closeLoginDialog();
  } catch (e) {
    showAuthError(e);
  } finally {
    els.signupSubmit.disabled = false;
  }
}

async function handleLogout() {
  await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (user) {
    els.authStatus.textContent = user.email || 'Kirjautunut';
    els.openLogin.hidden = true;
    els.logout.hidden = false;
    await loadFavorites(user.uid);
  } else {
    els.authStatus.textContent = 'Ei kirjautunut';
    els.openLogin.hidden = false;
    els.logout.hidden = true;
    state.favoriteIds = new Set();
  }
  // Re-render visible cards so heart buttons reflect new state
  if (state.events.length) renderEventsList(state.events, els.eventsList);
  if (state.view === 'favorites') renderFavoritesView();
});

// ── Wire events ──────────────────────────────────────────────────
els.navEvents.addEventListener('click', () => setView('events'));
els.navFavorites.addEventListener('click', () => setView('favorites'));
els.loadMore.addEventListener('click', () => loadEvents({ reset: false }));
els.openLogin.addEventListener('click', () => openLoginDialog());
els.logout.addEventListener('click', handleLogout);
els.loginCancel.addEventListener('click', closeLoginDialog);
els.loginSubmit.addEventListener('click', handleLogin);
els.loginForm.addEventListener('submit', handleLogin);
els.signupSubmit.addEventListener('click', handleSignup);

let searchDebounce;
els.searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.searchQuery = e.target.value.trim();
    loadEvents({ reset: true });
  }, 350);
});

// ── Initial load ─────────────────────────────────────────────────
loadEvents({ reset: true });
