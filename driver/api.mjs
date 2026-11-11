const ORIGIN = 'https://semitrax-api.onrender.com';
export class DriverApi {
  constructor(fetcher = fetch, onExpired = () => {}) {
    this.fetcher = fetcher; this.onExpired = onExpired;
    this.session = null; this.generation = 0; this.pending = new Set();
  }
  clear() {
    this.generation++; this.session = null;
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
  }
  async request(path, method = 'GET', body, token = this.session?.accessToken) {
    const generation = this.generation;
    const controller = new AbortController(); this.pending.add(controller);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.fetcher(ORIGIN + path, {
        method, signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (generation !== this.generation) throw new Error('Session changed. Please sign in again.');
      if (!response.ok) {
        if (response.status === 401 && token) { this.clear(); this.onExpired(); }
        throw new Error(response.status === 401 ? 'Sign in again. Check your email and password.' : response.status === 429 ? 'Too many requests. Wait a moment before retrying.' : 'The request could not be completed. Please retry.');
      }
      const result = response.status === 204 ? null : await response.json();
      if (generation !== this.generation) throw new Error('Session changed. Please sign in again.');
      return result;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Request canceled or timed out. Please retry when connected.');
      throw error;
    } finally { clearTimeout(timeout); this.pending.delete(controller); }
  }
  async login(email, password) {
    this.clear();
    const result = await this.request('/auth/login', 'POST', { email: email.trim(), password }, null);
    if (typeof result?.accessToken !== 'string' || !result.accessToken || typeof result?.refreshToken !== 'string' || !result.refreshToken) throw new Error('Invalid sign-in response. Please retry.');
    this.session = { accessToken: result.accessToken, refreshToken: result.refreshToken };
    return result.user;
  }
  async logout() {
    const refreshToken = this.session?.refreshToken; this.clear();
    if (refreshToken) await this.request('/auth/logout', 'POST', { refreshToken }, null);
  }
  profile() { return this.request('/me'); }
  trucks() { return this.request('/trucks'); }
  saveProfile(fullName, phone) { return this.request('/me', 'PATCH', { fullName: fullName.trim(), phone: phone.trim() || null }); }
}
