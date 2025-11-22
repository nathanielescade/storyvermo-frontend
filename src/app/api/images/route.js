// src/app/api/images/route.js
// This is a route handler that proxies image uploads to the backend
// It prevents exposing the backend API URL to the client

import { NEXT_PUBLIC_API_URL } from '../../../lib/api.server';

export async function POST(request) {
  try {
    // Read the form data from the client request
    const formData = await request.formData();

    // Forward the request to the backend API
    const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/images/`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type, let fetch set it with the boundary
        // 'Content-Type': 'multipart/form-data',  // ❌ Wrong
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image upload failed:', {
        status: response.status,
        error: errorText,
      });
      return Response.json(
        { error: 'Failed to upload image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error uploading image:', error);
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
