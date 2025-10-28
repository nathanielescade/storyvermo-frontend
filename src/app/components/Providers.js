// app/components/Providers.js
'use client';

import { AuthProvider } from "../../../contexts/AuthContext";
import { ApiProvider } from "../../../lib/apiProvider";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <ApiProvider>
        {children}
      </ApiProvider>
    </AuthProvider>
  );
}