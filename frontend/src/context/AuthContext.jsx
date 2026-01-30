import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      const token = localStorage.getItem('@InvestApp:token');
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error("Token inválido ou expirado", error);
          signOut();
        }
      }
      setLoading(false);
    };

    loadStorageData();
  }, []);

  const signIn = async (username, password) => {
    // 1. Obtém o Token
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/auth/token', formData);
    const { access_token } = response.data;

    // 2. Salva Token
    localStorage.setItem('@InvestApp:token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    // 3. Busca detalhes do usuário (Role Admin)
    const userResponse = await api.get('/auth/me');
    setUser(userResponse.data);
  };

  const register = async (username, password) => {
    await api.post('/auth/register', { username, password });
    await signIn(username, password);
  };

  const signOut = () => {
    localStorage.removeItem('@InvestApp:token');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ signed: !!user, user, signIn, register, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}