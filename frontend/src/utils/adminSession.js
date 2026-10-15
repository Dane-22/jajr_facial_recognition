// UI routing only; the server verifies the signature and current account role.
export const adminSession = (token = localStorage.getItem('admin_token')) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.type === 'admin' && Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now() ? payload : null;
  } catch { return null; }
};
