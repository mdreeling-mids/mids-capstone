import React, { useState } from "react";
import axios from "axios";
import { FaCalculator } from "react-icons/fa";
import { Card, CardContent } from "@mui/material";
import { Button } from "@mui/material";
import { MenuItem, Select, FormControl, InputLabel } from "@mui/material";

const API_URL = "https://s389gubjia.execute-api.us-west-2.amazonaws.com/production/predict";

function App() {
    const [features, setFeatures] = useState(Array(20).fill(1));
    const [prediction, setPrediction] = useState(null);

    const handleChange = (index, value) => {
        const updatedFeatures = [...features];
        updatedFeatures[index] = parseFloat(value);
        setFeatures(updatedFeatures);
    };

    const handleSubmit = async () => {
        try {
            const response = await axios.post(API_URL, { features });
            const result = JSON.parse(response.data.body).prediction;
            setPrediction(result);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f0f2f5", padding: "20px" }}>
            <Card style={{ padding: "24px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", maxWidth: "500px", width: "100%", borderRadius: "12px", backgroundColor: "#ffffff" }}>
                <CardContent style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <FaCalculator style={{ color: "#007bff", fontSize: "40px", marginBottom: "16px" }} />
                    <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>MathChecker</h1>
                    <p style={{ color: "#555", marginBottom: "16px" }}>Enter your answers below:</p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", width: "100%" }}>
                        {features.map((value, index) => (
                            <FormControl key={index} style={{ minWidth: "100px" }}>
                                <InputLabel>Feature {index + 1}</InputLabel>
                                <Select value={value} onChange={(e) => handleChange(index, e.target.value)}>
                                    {[1, 2, 3, 4, 5].map((num) => (
                                        <MenuItem key={num} value={num}>{num}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ))}
                    </div>

                    <Button onClick={handleSubmit} variant="contained" color="primary" style={{ marginTop: "24px" }}>Get Prediction</Button>
                    {prediction !== null && <h3 style={{ marginTop: "16px", fontSize: "18px", fontWeight: "bold", color: "#007bff" }}>Predicted Math Proficiency: {prediction}</h3>}
                </CardContent>
            </Card>
        </div>
    );
}

export default App;
