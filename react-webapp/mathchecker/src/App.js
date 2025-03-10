import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { useSearchParams } from "react-router-dom";
import { FaCalculator } from "react-icons/fa";
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Slider } from "@mui/material";

const CSV_DRIVE_URL = "https://docs.google.com/spreadsheets/d/101r-pZRkVnf3m13zUXXmjMgBzsKWXyerFvwu9efm744/export?format=csv&id=101r-pZRkVnf3m13zUXXmjMgBzsKWXyerFvwu9efm744&gid=0";
const API_URL = "https://s389gubjia.execute-api.us-west-2.amazonaws.com/production/predict";
const ADMIN_API_URL = "https://placeholder-admin-endpoint.com/submit";

function App() {
    const [searchParams] = useSearchParams();
    const isAdminMode = searchParams.get("admin") === "true";

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [orderedVariables, setOrderedVariables] = useState([]);
    const [prediction, setPrediction] = useState(null);

    useEffect(() => {
        fetchCSVFromDrive();
    }, []);

    const fetchCSVFromDrive = () => {
        axios.get(CSV_DRIVE_URL)
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
                const variableOrder = [];
                
                result.data.forEach(row => {
                    variableOrder.push(row.Variable_name);
                    let options = null;
                    try {
                        if (row.Variable_answers && row.Hide !== "Yes") {
                            options = JSON.parse(row.Variable_answers.replace(/""/g, '"'));
                        }
                    } catch (error) {
                        console.error("Error parsing JSON for:", row.Variable_name, error);
                    }
                    
                    if (isAdminMode) {
                        if (row.Admin_Only === "Yes") {
                            parsedQuestions.push({
                                variable: row.Variable_name,
                                context: row.Variable_context || "", 
                                question: row.Variable_label,
                                options: options,
                            });
                            if (options && options.length > 0) {
                                defaultAnswers[row.Variable_name] = options[0].value;
                            } else if (options?.range) {
                                defaultAnswers[row.Variable_name] = options.range.min;
                            }
                        }
                    } else {
                        if (row.Hide === "Yes") {
                            defaultAnswers[row.Variable_name] = parseInt(row.Variable_answers, 10) || 0;
                        } else {
                            parsedQuestions.push({
                                variable: row.Variable_name,
                                context: row.Variable_context || "", 
                                question: row.Variable_label,
                                options: options,
                            });
                            if (options && options.length > 0) {
                                defaultAnswers[row.Variable_name] = options[0].value;
                            } else if (options?.range) {
                                defaultAnswers[row.Variable_name] = options.range.min;
                            }
                        }
                    }
                });
                
                setQuestions(parsedQuestions);
                setAnswers(defaultAnswers);
                setOrderedVariables(variableOrder);
            }
        });
    };

    const handleInputChange = (variable, value) => {
        setAnswers(prev => ({ ...prev, [variable]: value }));
    };

    const handleSubmit = async () => {
        try {
            const featureValues = orderedVariables.map(varName => answers[varName]);
            const response = await axios.post(isAdminMode ? ADMIN_API_URL : API_URL, { features: featureValues });
            if (!isAdminMode) {
                const result = JSON.parse(response.data.body).prediction;
                setPrediction(result);
            }
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
                                    value={answers[q.variable] ?? q.options?.range?.min}
                                    onChange={(e, newValue) => handleInputChange(q.variable, newValue)}
                                    valueLabelDisplay="auto"
                                />
                            )}
                        </div>
                    ))}

                    <Button onClick={handleSubmit} variant="contained" color="primary" style={{ marginTop: "24px" }}>{isAdminMode ? "Submit" : "Get Prediction"}</Button>
                    {!isAdminMode && prediction !== null && <h3 style={{ marginTop: "16px", fontSize: "18px", fontWeight: "bold", color: "#007bff" }}>Predicted Math Proficiency: {prediction}</h3>}
                </CardContent>
            </Card>
        </div>
    );
}

export default App;