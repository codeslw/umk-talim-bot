import type { AdminMeta, Application, Course, DynamicSchemas, Stats, User } from './types';

const ADMIN_KEY_STORAGE = 'umkAdminKey';

export function getStoredAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

export function setStoredAdminKey(key: string) {
  if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  else localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export class ApiClient {
  constructor(private readonly getAdminKey: () => string) {}

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('x-admin-key', this.getAdminKey());
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(path, { ...options, headers });
    if (response.status === 204) return null as T;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed with ${response.status}`);
    return body.data as T;
  }

  health() {
    return fetch('/health').then((response) => response.ok);
  }

  meta() { return this.request<AdminMeta>('/api/settings/meta'); }
  schemas() { return this.request<DynamicSchemas>('/api/settings/schemas'); }
  saveSchemas(payload: DynamicSchemas) {
    return this.request<DynamicSchemas>('/api/settings/schemas', { method: 'PUT', body: JSON.stringify(payload) });
  }
  courses() { return this.request<Course[]>('/api/courses?includeInactive=true'); }
  createCourse(payload: Partial<Course>) {
    return this.request<Course>('/api/courses', { method: 'POST', body: JSON.stringify(payload) });
  }
  uploadCourseImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request<{ fileId: string }>('/api/courses/image', { method: 'POST', body: formData });
  }
  updateCourse(id: number, payload: Partial<Course>) {
    return this.request<Course>(`/api/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  deleteCourse(id: number) { return this.request<void>(`/api/courses/${id}`, { method: 'DELETE' }); }
  applications() { return this.request<Application[]>('/api/applications'); }
  createApplication(payload: Record<string, unknown>) {
    return this.request<Application>('/api/applications', { method: 'POST', body: JSON.stringify(payload) });
  }
  updateApplication(id: number, payload: Partial<Application>) {
    return this.request<Application>(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  updateApplicationStatus(id: number, status: string) {
    return this.request<Application>(`/api/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  }
  deleteApplication(id: number) { return this.request<void>(`/api/applications/${id}`, { method: 'DELETE' }); }
  stats() { return this.request<Stats>('/api/applications/stats'); }
  users(search = '') {
    return this.request<User[]>(`/api/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  }
  updateUser(id: number, payload: Partial<User>) {
    return this.request<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  deleteUser(id: number) { return this.request<void>(`/api/users/${id}`, { method: 'DELETE' }); }
}
