async function loginApi(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  // Safely read response
  const contentType = response.headers.get("content-type") || "";

  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();

    data = {
      message:
        text ||
        `Server returned ${response.status} ${response.statusText}`
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Login failed (${response.status})`
    );
  }

  // Make sure backend returned expected login data
  if (!data.token || !data.user) {
    throw new Error("Invalid login response from server.");
  }

  const userPayload = {
    role:
      data.user.role ||
      (email === "admin@vendorcrm.com"
        ? "Super Admin"
        : "Vendor Partner"),

    name: data.user.name,
    email: data.user.email,
    avatar: data.user.avatar || null,
    loggedInAt: new Date().toISOString()
  };

  setToken(data.token);
  setAuth(userPayload);
  setAuthChecked(true);

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(userPayload)
  );

  return userPayload;
}
