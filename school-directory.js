let profileSchool = '';
let schoolView = '';
let marketSchoolOverride = null;
let profileSchoolRequest = 0;
let pendingProfileSchool;
let schoolContentRequest = 0;
let schoolContentOffset = 0;

function selectedHomeSchool() {
  return marketSchoolOverride ?? (profileSchool || SolioSchools.ALL_SCHOOLS);
}

function applyProfileSchool(value) {
  profileSchool = SolioSchools.canonicalSchool(value);
  if (!schoolView && !location.hash && marketSchoolOverride === null) {
    school = selectedHomeSchool();
    ensureSolioListings();
    render();
  }
}

async function loadProfileSchool(userId) {
  const request = ++profileSchoolRequest;
  if (!userId) {
    marketSchoolOverride = null;
    applyProfileSchool('');
    return;
  }
  const profile = await db.from('seller_profiles').select('school').eq('user_id', userId).maybeSingle();
  if (request !== profileSchoolRequest || userId !== session?.user?.id) return;
  applyProfileSchool(profile.error ? '' : profile.data?.school);
}

async function openMySchool() {
  if (pendingProfileSchool) await pendingProfileSchool;
  if (!profileSchool) {
    requireSolioAccount(() => editOwnSchool(), 'Сургуулиа тохируулах');
    return;
  }
  marketSchoolOverride = null;
  openSolioMarket();
}

async function editOwnSchool() {
  const userId = session?.user?.id;
  if (!userId) return;
  const profile = await db.from('seller_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (session?.user?.id !== userId) return;
  if (profile.error) { toast('Профайлыг ачаалж чадсангүй.'); return; }
  document.getElementById('modal').classList.add('show');
  document.querySelector('.dialog').classList.remove('authDialog', 'detailDialog', 'quickPostDialog', 'easyDialog');
  editSolioProfile(profile.data || {});
}

function pushSchoolPath(path) {
  const query = new URLSearchParams(location.search);
  query.delete('tab');
  const search = query.size ? '?' + query : '';
  if (location.pathname + location.search + location.hash !== path + search) {
    history.pushState(null, '', path + search);
  }
}

function openSchoolPage(name) {
  const selected = SolioSchools.canonicalSchool(name);
  if (!selected) return;
  if (window.Capacitor?.isNativePlatform?.()) {
    location.assign(solioPublicPath(SolioSchools.schoolUrl(selected)));
    return;
  }
  resetMarketFilters(false);
  pushSchoolPath(SolioSchools.schoolUrl(selected));
  restoreSolioPage();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showSchoolPage(name) {
  schoolView = name;
  document.getElementById('market').setAttribute('aria-labelledby', 'schoolPageName');
  school = name;
  savedOnly = false;
  const tab = new URLSearchParams(location.search).get('tab');
  const kind = tab === 'club' || tab === 'event' ? tab : 'listing';
  document.getElementById('schoolPageHeading').hidden = false;
  document.getElementById('schoolPageName').textContent = SolioSchools.schoolName(name);
  document.getElementById('marketHomeHeading').hidden = true;
  document.getElementById('schoolScope').hidden = true;
  document.getElementById('marketListings').hidden = kind !== 'listing';
  document.getElementById('schoolSocieties').hidden = kind === 'listing';
  document.querySelectorAll('[data-school-tab]').forEach(link => {
    const selected = link.dataset.schoolTab === kind;
    if (selected) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    link.href = SolioSchools.schoolUrl(name) + (link.dataset.schoolTab === 'listing' ? '' : '?tab=' + link.dataset.schoolTab);
  });
  const catalogLink = document.getElementById('schoolProgramCatalog');
  const programPath = SolioSchools.schoolProgramPath(name);
  catalogLink.hidden = !programPath;
  if (programPath) catalogLink.href = solioPublicPath(programPath);
  updateBottomTabs('bottomSchools');
  if (kind === 'listing') {
    ensureSolioListings();
    render();
  } else {
    loadSchoolSocieties(kind);
  }
}

function resetSchoolPage() {
  if (!schoolView) return;
  schoolView = '';
  document.getElementById('market').setAttribute('aria-labelledby', 'boardTitle');
  schoolContentRequest++;
  document.getElementById('schoolPageHeading').hidden = true;
  document.getElementById('marketHomeHeading').hidden = false;
  document.getElementById('schoolScope').hidden = false;
  document.getElementById('marketListings').hidden = false;
  document.getElementById('schoolSocieties').hidden = true;
}

async function loadSchoolSocieties(kind, more = false) {
  const request = ++schoolContentRequest;
  const root = document.getElementById('schoolSocietyItems');
  const status = document.getElementById('schoolSocietyStatus');
  const next = document.getElementById('schoolSocietyMore');
  next.hidden = true;
  if (!more) root.replaceChildren();
  const offset = more ? schoolContentOffset + 24 : 0;
  status.textContent = 'Ачаалж байна…';
  try {
    const query = new URLSearchParams({ kind, school: schoolView, school_only: '1', offset });
    if (kind === 'event') query.set('scope', 'school');
    const response = await fetch('/api/societies?' + query);
    const payload = await response.json();
    if (!response.ok) throw Error(payload.error);
    if (request !== schoolContentRequest) return;
    schoolContentOffset = offset;
    status.textContent = !offset && !payload.items.length ?
      'Энэ сургуульд одоогоор ' + (kind === 'club' ? 'клуб' : 'эвент') + ' алга.' : '';
    const format = new Intl.DateTimeFormat('mn-MN', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    root.insertAdjacentHTML('beforeend', payload.items.map(item => {
      const date = new Date(item.starts_at);
      const when = kind === 'event' && !Number.isNaN(+date) ? format.format(date) : '';
      const url = '/#societies/' + kind + '/' + encodeURIComponent(item.id);
      return '<article class="schoolSocietyCard"><span>' + escapeHTML(item.category) + '</span>' +
        '<h3><a href="' + url + '">' + escapeHTML(item.name || item.title) + '</a></h3>' +
        (when ? '<time datetime="' + escapeHTML(item.starts_at) + '">' + escapeHTML(when) + '</time>' : '') +
        '<p>' + escapeHTML(kind === 'event' ? item.location : item.summary) + '</p></article>';
    }).join(''));
    next.textContent = 'Цааш үзэх';
    next.hidden = !payload.has_more;
    next.onclick = () => loadSchoolSocieties(kind, true);
  } catch {
    if (request !== schoolContentRequest) return;
    status.textContent = 'Мэдээллийг ачаалж чадсангүй.';
    next.hidden = false;
    next.textContent = 'Дахин оролдох';
    next.onclick = () => loadSchoolSocieties(kind, more);
  }
}

function openSchoolPicker(button, onSelect) {
  const picker = document.getElementById('schoolPicker');
  const field = document.getElementById('schoolPickerQuery');
  const list = document.getElementById('schoolPickerItems');
  const selection = schoolView || school;
  function draw() {
    list.innerHTML = SolioSchools.matchSchoolNames(field.value).map(name =>
      '<button type="button" data-pick-school="' + escapeHTML(name) + '"' +
      (name === selection ? ' aria-current="true"' : '') + '>' + escapeHTML(SolioSchools.schoolName(name)) +
      (SolioSchools.schoolName(name) === name ? '' : '<small>' + escapeHTML(name) + '</small>') + '</button>'
    ).join('') || '<p>Тохирох сургууль олдсонгүй.</p>';
  }
  field.value = '';
  field.oninput = draw;
  list.onclick = event => {
    const option = event.target.closest('[data-pick-school]');
    if (!option) return;
    picker.close();
    onSelect(option.dataset.pickSchool);
  };
  draw();
  const box = button.getBoundingClientRect();
  picker.style.setProperty('--picker-left', Math.max(12, Math.min(box.left, window.innerWidth - 342)) + 'px');
  picker.style.setProperty('--picker-top', Math.max(10, Math.min(box.bottom + 6, window.innerHeight - 280)) + 'px');
  button.setAttribute('aria-expanded', 'true');
  picker.onclose = () => {
    button.setAttribute('aria-expanded', 'false');
    if (button.isConnected && button.getClientRects().length) button.focus({ preventScroll: true });
  };
  picker.showModal();
  field.focus();
}

function syncSchoolControls() {
  const mine = document.getElementById('marketMySchool');
  const all = document.getElementById('marketAllSchools');
  mine.setAttribute('aria-pressed', String(!!profileSchool && school === profileSchool));
  all.setAttribute('aria-pressed', String(school === SolioSchools.ALL_SCHOOLS));
  const scope = document.getElementById('viewingSchool');
  scope.hidden = !!schoolView || school === SolioSchools.ALL_SCHOOLS;
  scope.textContent = scope.hidden ? '' : school;
  document.getElementById('marketSwitchSchool').dataset.selected =
    String(school !== SolioSchools.ALL_SCHOOLS && school !== profileSchool);
}
