import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { FaCalculator } from "react-icons/fa";
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Slider } from "@mui/material";

const S3_CSV_URL = "https://sagemaker-us-west-2-986030204467.s3.us-west-2.amazonaws.com/capstone/questions1.csv?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEI%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLXdlc3QtMiJGMEQCIAbbT9nMt7DmTjdIFK2GJUSXzaDic%2BqBDdMMffYpA3TEAiAYzRc4HpyyCvHn5DZi3VhpmhEMwnH93BBqNLTt4IM3Kyq1BAjI%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAAaDDk4NjAzMDIwNDQ2NyIMXK%2FGBQHi4H%2FYSOl4KokEIsNQve2%2BGiV2dtgEFWjY7qDKqVNfxyWKtLIFsKdnPu4beglqqDyXwJ2YaZRyXJK7H1h3mDR70h6uHyqT6yazVpRrCf77M5g39ZB995U7xqnhKGEQgg37YfmIGzz%2FI9lYLy76aIZ%2FMRX0FfYDBYQRWbpO785kCTIRfRgT%2FN8xebKOzz%2BeYHswI1U8RGBdar4zcTiGFe89ZqKyHGEc1xcyN0KFU5FnwgqOTOaaVuVlp3FV67B5I1wehCBYRVNDqYyR198PcPxd%2Br8kiFF2Hc3A1pGKmgH10%2FdNrNou0739Sw5ZSE3Ti1T7EQgCWN8fk25tWh1JbYbSzmqnVD9nCXGaSrzjuvO4VzC%2F8HdXxko2q7k1S5S8gEmMGEI0kfbpyh3HDbZAenM%2BldUyYxSKMl8iQdb98m4%2B2pD1gUgbQchTj9j0FF4k0SA7cOo6Ha5xHGHBYycwpuz3GWz8mu0vIjS9NlYkWe0VXUx7YJHD9Q38SLJKV1C69LImnXWSEVFw%2F4fb4Xne6Vktxn18MbblqulIM4gAoN%2FrmS%2FZNaHKF3mBMat%2BOljLGsfExFQLD%2BupAMaMWQFjkR9DaVrVJRoUR0diM%2BqivBe5PE3g5EHm4m9ujXf%2BSEBYGEmE5Mp%2FgWvA0EidNh6Rb50nyg1n7eNJ2%2Bv%2FFy67DwPlYdD%2BuPlNW%2Fioen0y%2Br1WHMRx1FAw2LyTvgY6xgIBGXxqP9DHHGXPDXErEQEwJajJV8b7cxK8RnPzSWn4GwHrNiHqBhwnT3w2Bhrg0ylS%2Bom4L00nP6C3rpzvuT96qQ6%2BsRvNdKO%2BQjpx9OgJNxM3y9DcM30iLxteWBG6eyr2WX5SFyYeFIH%2FzZ%2BVjhJskP0i0OGqxLHMni3KocA86L7N%2FoHbdFdlDx3%2F9IspDdVoodeQrGbPMLyq7STf9mCy1xv%2Fiv0pP%2BS0ftBgoFu%2F45tRl4npjR8%2B8OL7Mtx3ImYotQ2JRrArL8yV3l1YctkogGaVO3knLAgOSqAZuyC%2FTlGXq47HKgQPQVErmzdnUFJjHd2TPIRnXBbXSG2d9kbYLgcfxEfZT3m8%2BEpov18PkUnke81v3913qWjOzcamNhVYSmY9Y6Wu6kSomxNA3ExxAF8veX%2F7hckJFBSPTh8RCJuYfZIU9g%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA6LE724YZUCV3QHI3%2F20250302%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250302T224141Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=49ef43f700807bc2b159c108309c9494b6afc795fe7925880ca4abf0b004c314";
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
