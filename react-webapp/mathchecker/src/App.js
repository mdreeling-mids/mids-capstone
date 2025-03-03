import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { FaCalculator } from "react-icons/fa";
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Slider } from "@mui/material";

const S3_CSV_URL = "https://sagemaker-us-west-2-986030204467.s3.us-west-2.amazonaws.com/capstone/questions3.csv";
const API_URL = "https://s389gubjia.execute-api.us-west-2.amazonaws.com/production/predict";

function App() {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [prediction, setPrediction] = useState(null);

    useEffect(() => {
        fetchCSVFromS3();
    }, []);

    const fetchCSVFromS3 = () => {
        axios.get(S3_CSV_URL)
            .then(response => {
                parseCSV(response.data);
            })
            .catch(error => console.error("Error fetching CSV:", error));
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                parseCSV(e.target.result);
            };
            reader.readAsText(file);
        }
    };

    const parseCSV = (csvData) => {
        Papa.parse(csvData, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (result) => {
                const parsedQuestions = [];
                const defaultAnswers = {};
                
                result.data.forEach(row => {
                    let options = null;
                    try {
                        if (row.Variable_answers && row.Hide !== "Yes") {
                            options = JSON.parse(row.Variable_answers.replace(/""/g, '"'));
                        }
                    } catch (error) {
                        console.error("Error parsing JSON for:", row.Variable_name, error);
                    }
                    
                    if (row.Hide === "Yes") {
                        // If Hide is Yes, use the default integer value from Variable_answers
                        defaultAnswers[row.Variable_name] = parseInt(row.Variable_answers, 10) || 0;
                    } else {
                        parsedQuestions.push({
                            variable: row.Variable_name,
                            context: row.Variable_context || "", // Include context
                            question: row.Variable_label,
                            options: options,
                        });
                        // Default dropdown to first option
                        if (options && options.length > 0) {
                            defaultAnswers[row.Variable_name] = options[0].value;
                        }
                    }
                });
                
                setQuestions(parsedQuestions);
                setAnswers(defaultAnswers); // Pre-fill hidden values and set defaults
            }
        });
    };

    const handleInputChange = (variable, value) => {
        setAnswers(prev => ({ ...prev, [variable]: value }));
    };

    const handleSubmit = async () => {
        try {
            const featureValues = Object.values(answers);
            const response = await axios.post(API_URL, { features: featureValues });
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
                    <p style={{ color: "#555", marginBottom: "16px" }}>Answer the following questions:</p>
                    <input type="file" accept=".csv" onChange={handleFileUpload} style={{ marginBottom: "16px" }} />

                    {questions.map((q, index) => (
                        <div key={index} style={{ width: "100%", marginBottom: "16px" }}>
                            {q.context && (
                                <p style={{ fontStyle: "italic", color: "#777", marginBottom: "8px" }}>{q.context}</p>
                            )}
                            <p style={{ fontWeight: "bold" }}>{q.question}</p>
                            {Array.isArray(q.options) ? (
                                <FormControl fullWidth>
                                    <InputLabel>Select an option</InputLabel>
                                    <Select value={answers[q.variable]} onChange={(e) => handleInputChange(q.variable, e.target.value)}>
                                        {q.options.map((opt, i) => (
                                            <MenuItem key={i} value={opt.value}>{opt.text}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <Slider
                                    min={q.options?.range?.min || 1}
                                    max={q.options?.range?.max || 10}
                                    step={q.options?.range?.step || 1}
                                    value={answers[q.variable] || q.options?.range?.min || 1}
                                    onChange={(e, newValue) => handleInputChange(q.variable, newValue)}
                                    valueLabelDisplay="auto"
                                />
                            )}
                        </div>
                    ))}

                    <Button onClick={handleSubmit} variant="contained" color="primary" style={{ marginTop: "24px" }}>Get Prediction</Button>
                    {prediction !== null && <h3 style={{ marginTop: "16px", fontSize: "18px", fontWeight: "bold", color: "#007bff" }}>Predicted Math Proficiency: {prediction}</h3>}
                </CardContent>
            </Card>
        </div>
    );
}

export default App;