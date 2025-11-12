import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/pages/LandingPage';
import AuthOrDashboard from './AuthOrDashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/*" element={<AuthOrDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}