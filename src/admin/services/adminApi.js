import adminApiClient from "./adminApiClient";

export async function safeRequest(request, fallback) {
  try {
    const response = await request();
    return response?.data ?? response;
  } catch {
    if (typeof fallback === "function") {
      return fallback();
    }
    return fallback;
  }
}

export function get(path, options = {}) {
  return adminApiClient.get(path, options);
}

export function post(path, payload) {
  return adminApiClient.post(path, payload);
}

export function put(path, payload) {
  return adminApiClient.put(path, payload);
}

export function patch(path, payload) {
  return adminApiClient.patch(path, payload);
}

export function del(path, payload) {
  if (payload) {
    return adminApiClient.delete(path, { data: payload });
  }
  return adminApiClient.delete(path);
}
