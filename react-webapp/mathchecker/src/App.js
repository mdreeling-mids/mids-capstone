import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { FaCalculator } from "react-icons/fa";
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Slider } from "@mui/material";

const S3_CSV_URL = "https://sagemaker-us-west-2-986030204467.s3.us-west-2.amazonaws.com/capstone/questions3.csv?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEJD%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJHMEUCIG6mO5CoyOTdp9IJICSHhyQ7RvKTAye8ZcdtwxSHh9TGAiEAzaI%2Bf0%2FstBx2k%2FNiIU%2B6%2BLlCw7DR%2BI3PSux%2BRvhrKeMqtQQIyf%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw5ODYwMzAyMDQ0NjciDGX5GYgN5lRW1HEDMCqJBPzzUpeO01kXM%2F0RspDr%2FhYlCWkX6jeQhXZQt8FeQc4WaW0VUwJ0CIJ6VHZGEbA3v80uqmGfEfHRGZm3yGP4PhYxZORtXqIKSQRSzS75b%2BvWOhZIK2Fzxtoi03OrH%2BOWYmdV%2ByTRypW5eGJof4SLDt%2FoYyjXWIEUzL05ccINfxoVYVQBTHehnpRGkO58yH%2Fort1h8BqZ2qzaFeizGjLpheGjGxJEzPGc6lBpWRLX9pRlZXd6iVuxumNAemNDv0Ji%2FcraGL9n%2FPzeh5x4ThEZFr8InAmkuFRdv0gQWWQOWn2Mo46kLmhqmWORq0L0R9TEskfPDiRuCO4NRuMscHX7EkG0c3u%2FIytq9cKzleIXXQ16%2BykxANsosOklAXXj%2Breyqi2jd%2BNtWzixxTePdowrISb7odrsX%2FHFBrWgsaMhUseq%2FdnziL3IUc6pIa5LkcuB52HueZb9hsWEyznjZAFOU%2FV4xBsB%2B51YRsH%2BJ5vqN47XQNFnoNJJtsr%2BAg%2BYxo5TiQewGH1mgY4IMHo1SYGEUqKV5cKhMoVfTcYOAeoRMbSlCPBU4BF2tXc7MK7p2r1oYW54oTM%2FT8K66kbyqAFmd9dsANSh2JZgXbD3rZZRSgPcxz6WY%2BmZsLT3DziAwHdZbIoz5tkteF5Bipsz6fFQ1E96D3aR9AYQPK4BcgXWaebS%2Bn2dQkCoyZ6DMNrWk74GOsUCJj0iilEcASKDafkFVuO0hnGkf5sBa3rCV7ZUvgePqY842Q3S%2B3f0Qu4xdo3Hhvs2YMRKvsZrBJ9I%2FCSBvZLGAcGjMiic9U%2BPqhSJZlQPn6m0rDECqcKWJxLwfWRFNqwTO6tmnefNI%2FeYQ6A2M11VN4Cl%2BtphchyYl05yRhcV0uR8PqsSkj1Z4czlC0ix9%2Ffjn4iPbNXMqqESnxA1Ld3lsZudgai0CALB%2Ft%2FCVBJtytV3JxmQsuV6xLhXXtBTFGEJKs0zF1dsAERzj6c0EgjHmkwCdf8sfPZnNFDeDpfP0aREdPxapMkNLQ9RTukUQnPmJdZf8X8RK0u%2B3u1K5bws2lwVczapSfVVjQTXfL%2B0MEaN4ZOvd4yMubZ2hkdC%2B%2BIquUo7A5%2F02uDkVeuu0ByjfPUyYABXa2yZMGrYNC8X89rydbf%2B2g%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA6LE724YZ37GS6ZWQ%2F20250302%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250302T233855Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=4181c54d1b4cc1d4aab50f69a32afa19f7f8e2a119c93e4ec4b84d2e33bd27f7";
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
                const parsedQuestions = result.data.map(row => {
                    let options = null;
                    try {
                        if (row.Variable_answers) {
                            options = JSON.parse(row.Variable_answers.replace(/""/g, '"'));
                        }
                    } catch (error) {
                        console.error("Error parsing JSON for:", row.Variable_name, error);
                    }

                    return {
                        variable: row.Variable_name,
                        context: row.Variable_context || "", // Include context
                        question: row.Variable_label,
                        options: options,
                    };
                });

                setQuestions(parsedQuestions);
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
                    <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>EMRI (Early Math Risk Idenitifier)</h1>
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
                                    <Select value={answers[q.variable] || ""} onChange={(e) => handleInputChange(q.variable, e.target.value)}>
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
