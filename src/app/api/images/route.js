// src/app/api/images/route.js
// This is a route handler that proxies image uploads to the backend
// It prevents exposing the backend API URL to the client

export async function POST(request) {
  try {
    // Read the form data from the client request
    const formData = await request.formData();


    // Get API URL from environment variable
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      return Response.json(
        { error: 'Internal server error', details: 'API URL not configured' },
        { status: 500 }
      );
    }

    // Forward the request to the backend API, including the cookie header for session auth
    const incomingCookies = request.headers.get('cookie');
    const csrfToken = request.headers.get('x-csrftoken') || request.headers.get('x-xsrf-token');
    const response = await fetch(`${apiUrl}/api/images/`, {
      method: 'POST',
      headers: {
        ...(incomingCookies ? { cookie: incomingCookies } : {}),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        // Don't set Content-Type, let fetch set it with the boundary
        // 'Content-Type': 'multipart/form-data',  // ❌ Wrong
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: 'Failed to upload image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
