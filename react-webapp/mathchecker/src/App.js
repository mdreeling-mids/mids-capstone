import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage"; // ⬅️ import it
import AppForm from "./FormApp"; // rename your original App component to AppForm

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppForm />} />
    </Routes>
  );
}