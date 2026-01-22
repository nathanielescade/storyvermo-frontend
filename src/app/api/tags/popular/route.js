// src/app/api/tags/popular/route.js
// This is a route handler that proxies requests to the backend
// It prevents exposing the backend API URL to the client

export async function GET(request) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      return Response.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Proxy the request to the backend API
    const response = await fetch(`${apiUrl}/api/tags/popular/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch popular tags' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
