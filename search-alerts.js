let searchAlertPoll = 0;
let searchAlertRequest;
let searchAlertUnread = 0;

async function savedSearchRequest(input) {
  const token = await appwriteAccount.createJWT();
  const headers = { Authorization: 'Bearer ' + token.jwt };
  if (input) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/saved-searches', {
    method: input ? 'POST' : 'GET', headers, cache: 'no-store',
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Үйлдэл амжилтгүй.');
  return data;
}

function queueListingMatch(id) {
  void savedSearchRequest({ action: 'publish', id }).catch(error => {
    console.warn('Solio listing matches will be recovered when the inbox syncs:', error.message);
  });
}

function saveCurrentListingSearch() {
  openSavedSearchForm(document.getElementById('search').value, school);
}

function openSavedSearchForm(term, scope) {
  requireSolioAccount(() => {
    const school = SolioSchools.canonicalSchool(scope);
    const body = document.getElementById('modalBody');
    document.querySelector('.dialog').classList.remove('authDialog', 'detailDialog', 'quickPostDialog', 'easyDialog');
    body.innerHTML = '<section class="savedSearchDialog"><h2>Олдвол мэдэгд</h2>' +
      '<form id="savedSearchForm"><label>Хайх бараа<input name="term" required minlength="3" maxlength="120" value="' +
      escapeHTML(String(term || '').slice(0, 120)) + '"></label>' +
      '<label>Сургууль<select name="school"><option value="">Бүх сургууль</option>' +
      SolioSchools.directory.map(name => '<option>' + escapeHTML(name) + '</option>').join('') +
      '</select></label><button type="submit" class="schoolPrimary">Хайлт хадгалах</button><p role="status"></p></form></section>';
    const form = document.getElementById('savedSearchForm');
    form.elements.school.value = school;
    document.getElementById('modal').classList.add('show');
    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('button');
      const status = form.querySelector('[role=status]');
      button.disabled = true;
      try {
        await savedSearchRequest({ action: 'save', term: form.elements.term.value, school: form.elements.school.value });
        if (form.isConnected) closeModal();
        toast('Хайлт хадгалагдлаа.');
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
  }, 'Олдвол мэдэгд');
}

async function openSavedSearches() {
  const body = document.getElementById('modalBody');
  body.innerHTML = '<section class="savedSearchDialog"><button type="button" class="solioNotifBack" onclick="openSolioProfile()">← Профайл</button><h2>Хадгалсан хайлтууд</h2><div id="savedSearchItems" role="status">Ачаалж байна…</div></section>';
  const items = document.getElementById('savedSearchItems');
  try {
    const result = await savedSearchRequest();
    if (!items.isConnected) return;
    items.innerHTML = result.searches.map(item => '<article><div><strong>' + escapeHTML(item.term) +
      '</strong><small>' + escapeHTML(item.school || SolioSchools.ALL_SCHOOLS) + '</small></div>' +
      '<button type="button" data-delete-search="' + escapeHTML(item.id) + '">Устгах</button></article>').join('') ||
      '<p>Хадгалсан хайлт алга.</p>';
    items.onclick = async event => {
      const button = event.target.closest('[data-delete-search]');
      if (!button) return;
      button.disabled = true;
      try {
        await savedSearchRequest({ action: 'delete', id: button.dataset.deleteSearch });
        button.closest('article').remove();
        if (!items.children.length) items.textContent = 'Хадгалсан хайлт алга.';
      } catch (error) {
        toast(error.message);
        button.disabled = false;
      }
    };
  } catch (error) {
    items.textContent = error.message;
  }
}

function showSearchAlertCount() {
  const dot = document.getElementById('listingAlertDot');
  dot.hidden = !searchAlertUnread;
  const nav = document.getElementById('navListingAlerts');
  nav.hidden = !searchAlertUnread;
  nav.querySelector('span').textContent = searchAlertUnread;
  const account = document.getElementById('bottomAccount');
  account.setAttribute('aria-label', searchAlertUnread ? 'Миний · ' + searchAlertUnread + ' шинэ мэдэгдэл' : 'Миний');
}

function syncSearchAlerts() {
  const user = session?.user?.id;
  if (!user) return Promise.resolve(null);
  if (searchAlertRequest?.user === user) return searchAlertRequest.promise;
  const request = {
    user,
    promise: savedSearchRequest({ action: 'inbox' }).then(data => {
      if (session?.user?.id !== user) return null;
      searchAlertUnread = data.unread;
      showSearchAlertCount();
      return data;
    }).finally(() => {
      if (searchAlertRequest === request) searchAlertRequest = undefined;
    }),
  };
  searchAlertRequest = request;
  return request.promise;
}

function startSearchAlerts() {
  clearInterval(searchAlertPoll);
  searchAlertUnread = 0;
  showSearchAlertCount();
  if (!session) return;
  const refresh = () => {
    if (document.visibilityState === 'visible') void syncSearchAlerts().catch(() => {});
  };
  refresh();
  searchAlertPoll = setInterval(refresh, 60_000);
}

document.addEventListener('visibilitychange', () => {
  if (session && document.visibilityState === 'visible') void syncSearchAlerts().catch(() => {});
});
