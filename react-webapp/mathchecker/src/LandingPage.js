import React from "react";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { FaBrain, FaBookOpen, FaRocket } from "react-icons/fa";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", backgroundColor: "#f9fafb", color: "#333" }}>
      {/* Header */}
      <header style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
      <img
          src="/emri-logo-tps-512.png"
          alt="Get EMRI Logo"
          style={{ height: "75px" }} // Adjust size as needed
        />
        <nav>
          <Link to="#features" style={{ margin: "0 12px", color: "#333", textDecoration: "none" }}>Features</Link>
          <Link to="#about" style={{ margin: "0 12px", color: "#333", textDecoration: "none" }}>About</Link>
          <Link to="#try" style={{ margin: "0 12px", color: "#007bff", textDecoration: "none", fontWeight: "bold" }}>Try It</Link>
        </nav>
      </header>

      {/* Hero */}
      <section style={{ padding: "80px 20px", textAlign: "center", backgroundColor: "#e3f2fd" }}>
        <h2 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "16px" }}>Early Math Risk Identifier</h2>
        <p style={{ fontSize: "18px", maxWidth: "700px", margin: "0 auto 32px" }}>
          Get EMRI helps educators identify early signs of math proficiency risk using advanced machine learning models trained on PISA 2022 data.
        </p>
        <Button
          variant="contained"
          size="large"
          color="primary"
          component={Link}
          to="/app"
          id="try"
        >
          Try It Now
        </Button>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "60px 20px", backgroundColor: "#fff" }}>
        <h3 style={{ fontSize: "28px", textAlign: "center", marginBottom: "40px" }}>Key Features</h3>
        <div style={{ display: "flex", justifyContent: "center", gap: "40px", flexWrap: "wrap" }}>
          <Feature icon={<FaBrain />} title="AI-Powered" text="Backed by neural networks trained on international education data." />
          <Feature icon={<FaBookOpen />} title="Educator Friendly" text="Simple question-based interface designed for ease of use." />
          <Feature icon={<FaRocket />} title="Fast Results" text="Instant predictions with personalized recommendations." />
        </div>
      </section>

      {/* About */}
      <section id="about" style={{ padding: "60px 20px", backgroundColor: "#f0f2f5" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h3 style={{ fontSize: "28px", marginBottom: "20px" }}>About the Project</h3>
          <p>
            Get EMRI was developed as part of the UC Berkeley Master of Information and Data Science (MIDS) capstone. It is based on the 2022 Programme for International Student Assessment (PISA) and is meant to support early identification and intervention in student math proficiency.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "20px 40px", textAlign: "center", backgroundColor: "#333", color: "#fff" }}>
        <p>&copy; {new Date().getFullYear()} Get EMRI. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div style={{ width: "250px", textAlign: "center" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px", color: "#007bff" }}>{icon}</div>
      <h4 style={{ fontSize: "20px", marginBottom: "8px" }}>{title}</h4>
      <p style={{ fontSize: "14px", color: "#555" }}>{text}</p>
    </div>
  );
}
