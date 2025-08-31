// src/hooks/useAuth.js
import axios from "axios";

const BASE_URL = "http://localhost:4000/api/auth";

const useAuth = () => {
  const token = localStorage.getItem("token");
 const role = (localStorage.getItem("role") || "").toUpperCase();

  // 🔐 Récupérer l'objet user sans casser si il est vide
  let user = null;
  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (err) {
    console.error("❌ Erreur de parsing JSON user:", err);
    user = null;
  }

  const isAuthenticated = !!token;

  const register = async (email, username, password, role) => {
    const response = await axios.post(`${BASE_URL}/register`, {
      name: username,
      email,
      login: username,
      password,
      role
    });
    return response.data;
  };
  const signInWithEmail = async (loginOrEmail, password) => {
    const response = await axios.post(`${BASE_URL}/login`, {
      loginOrEmail,
      password
    });

    const { token, role, user } = response.data;

    localStorage.setItem("token", token);
    localStorage.setItem("role", role.toUpperCase()); 
    localStorage.setItem("user", JSON.stringify(user));

    return role;
  };

  const signInWithGoogle = async () => {
    console.log("Google Sign In appelé");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/session/signin";
  };

  return {
    register,
    signInWithEmail,
    signInWithGoogle,
    logout,
    isAuthenticated,
    role,
    user
  };
};

export default useAuth;
