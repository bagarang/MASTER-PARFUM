/* =====================================================================
   AUTH
   ===================================================================== */
const Auth = (() => {
  let currentUser = null;

  function getUser() { return currentUser; }

  function loadFromStorage() {
    try {
      const raw = sessionStorage.getItem(APP_CONFIG.SESSION_KEY);
      if (raw) { currentUser = JSON.parse(raw); return currentUser; }
    } catch (e) {}
    return null;
  }

  function saveToStorage(user) {
    currentUser = user;
    sessionStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify(user));
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem(APP_CONFIG.SESSION_KEY);
  }

  async function login(username, password) {
    const data = await API.post('login', { username, password });
    saveToStorage(data.user);
    return data.user;
  }

  function isOwner() {
    return currentUser && currentUser.role === 'Owner';
  }

  return { getUser, loadFromStorage, saveToStorage, logout, login, isOwner };
})();
