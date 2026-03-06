import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AgentPage from "./components/AgentPage";
import SurveyPage from "./components/SurveyPage";
import GiftPage from "./components/GiftPage";
import AdminPage from "./components/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/survey/:id" element={<SurveyPage />} />
        <Route path="/gift" element={<GiftPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<Navigate to="/agent" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
