import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { useSearchParams } from "react-router-dom";
import { FaCalculator, FaChalkboardTeacher } from "react-icons/fa";
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Slider } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

const CSV_DRIVE_URL = "https://docs.google.com/spreadsheets/d/101r-pZRkVnf3m13zUXXmjMgBzsKWXyerFvwu9efm744/export?format=csv&id=101r-pZRkVnf3m13zUXXmjMgBzsKWXyerFvwu9efm744&gid=0";
const API_URL = "https://s389gubjia.execute-api.us-west-2.amazonaws.com/production/predict";
const ADMIN_API_URL = "https://placeholder-admin-endpoint.com/submit";
const RECOMMENDATION_CUTOFF = 0.66;

function App() {

    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);

    const [currentStep, setCurrentStep] = useState(0);

    const [searchParams] = useSearchParams();
    const isAdminMode = searchParams.get("admin") === "true";

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [orderedVariables, setOrderedVariables] = useState([]);
    const [prediction, setPrediction] = useState(null);

    const [selectedCountry, setSelectedCountry] = useState("United States");
    const countryConfig = {
        "United States": {
            model: "United_States.model.tar.gz",
            csv: "https://docs.google.com/spreadsheets/d/1FfRrQdpofKueFROn75V8OuFBgiQsPAKPpDQ67DA1G4I/export?format=csv&id=1FfRrQdpofKueFROn75V8OuFBgiQsPAKPpDQ67DA1G4I&gid=0"
        },
        "Thailand": {
            model: "ThailandV2.model.tar.gz",
            csv: "https://docs.google.com/spreadsheets/d/1XMxllwL8DJ3QjZ54QrHRiZrUIsZX17DE4lMyshKOFz4/export?format=csv&gid=0"
        }
    };

    const checkThreshold = (thresholdString, answerValue) => {
        if (!thresholdString || answerValue == null) {
          console.warn("🟡 Skipping check: invalid threshold or answer", {
            thresholdString,
            answerValue
          });
          return false;
        }
      
        const match = thresholdString.match(/^([<>])\s*(\d+(\.\d+)?)$/);
        if (!match) {
          console.warn("❌ Threshold parse failed:", thresholdString);
          return false;
        }
      
        const operator = match[1];
        const thresholdValue = parseFloat(match[2]);
      
        const result =
          operator === "<"
            ? answerValue < thresholdValue
            : operator === ">"
            ? answerValue > thresholdValue
            : false;
      
        console.log("🧪 Threshold check:", {
          variableAnswer: answerValue,
          condition: thresholdString,
          parsedOperator: operator,
          thresholdValue,
          result
        });
      
        return result;
      };
      

    const getDisplayAnswer = (question) => {
        const value = answers[question.variable];
        if (Array.isArray(question.options)) {
          const match = question.options.find(opt => opt.value === value);
          return match ? match.text : value;
        }
        return value;
      };

    useEffect(() => {
        fetchCSVFromDrive(countryConfig[selectedCountry].csv);
    }, []);

    useEffect(() => {
        fetchCSVFromDrive(countryConfig[selectedCountry].csv);
    }, [selectedCountry]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, [currentStep]);

    const fetchCSVFromDrive = (url) => {
        axios.get(url)
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
                    
                    console.log("Parsed Question:", row.Variable_name, "Context:", row.Variable_context, "Options:", options, "Range:", options?.range);
                    
                
                    if (isAdminMode) {
                        if (row.Admin_Only === "Yes") {
                            parsedQuestions.push({
                                variable: row.Variable_name,
                                context: row.Variable_context || "", 
                                question: row.Variable_label,
                                options: options,
                            });
                            if (!(row.Variable_name in defaultAnswers)) {
                                if (Array.isArray(options)) {
                                  defaultAnswers[row.Variable_name] = options[0].value;
                                } else if (options?.range) {
                                  defaultAnswers[row.Variable_name] = options.range.min;
                                } else {
                                  defaultAnswers[row.Variable_name] = null;
                                }
                              }
                        }
                    } else {
                        if (row.Hide === "Yes") {
                            defaultAnswers[row.Variable_name] = parseInt(row.Hidden_Value, 10) || 0;
                        } else {
                            parsedQuestions.push({
                                variable: row.Variable_name,
                                context: row.Variable_context || "",
                                question: row.Variable_label,
                                options: options,
                                recommendationThreshold: row.Recommendation_Threshold || null,
                                recommendationText: row.Recommended_Intervention || null
                              });
                              if (!(row.Variable_name in defaultAnswers)) {
                                if (Array.isArray(options)) {
                                  defaultAnswers[row.Variable_name] = options[0].value;
                                } else if (options?.range) {
                                  defaultAnswers[row.Variable_name] = options.range.min;
                                } else {
                                  defaultAnswers[row.Variable_name] = null;
                                }
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
    
            const response = await axios.post(
                isAdminMode ? ADMIN_API_URL : API_URL,
                {
                    instances: [featureValues] // ✅ Wrap in array for batch format
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-amzn-sagemaker-target-model": countryConfig[selectedCountry].model
                    }
                }
            );
    
            if (!isAdminMode) {
                console.log("📦 Full Axios response:", response);
                console.log("📦 response.data:", response.data);
            
                let rawPredictionBlock = response.data;
            
                // Some setups wrap it under `body`, others don’t
                if (typeof rawPredictionBlock === "string") {
                    rawPredictionBlock = JSON.parse(rawPredictionBlock);
                }
            
                const innerPredictionString = rawPredictionBlock?.prediction;
            
                if (typeof innerPredictionString === "string") {
                    const parsedPrediction = JSON.parse(innerPredictionString);
                    const value = parsedPrediction?.predictions?.[0]?.[0];
            
                    if (value !== undefined) {
                        setPrediction(value);
                        // Only show recommendations if prediction is at or below cutoff
                        setShowRecommendations(true);
                        setHasSubmitted(true);
                    } else {
                        console.error("⚠️ Prediction format invalid:", parsedPrediction);
                    }
                } else {
                    console.error("⚠️ No 'prediction' string in response:", rawPredictionBlock);
                }
            }
            
            
        } catch (error) {
            console.error("Error:", error);
        }
    };
    

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f0f2f5", padding: "20px" }}>
            <div style={{ position: "absolute", top: 20, right: 20 }}>
    <FormControl variant="outlined" size="small">
        <InputLabel>Choose Country</InputLabel>
        <Select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            label="Choose Country"
        >
            <MenuItem value="United States">United States</MenuItem>
            <MenuItem value="Thailand">Thailand</MenuItem>
        </Select>
    </FormControl>
</div>
            <Card style={{ padding: "24px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", maxWidth: "500px", width: "100%", borderRadius: "12px", backgroundColor: "#ffffff" }}>
            <CardContent style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {isAdminMode ? (
                        <FaChalkboardTeacher style={{ color: "#d9534f", fontSize: "40px", marginBottom: "16px" }} />
                    ) : (
                        <FaCalculator style={{ color: "#007bff", fontSize: "40px", marginBottom: "16px" }} />
                    )}
                    {!disclaimerAccepted ? (
                    <>
                        <h2 style={{ marginBottom: "16px" }}>Disclaimer</h2>
                        <p style={{ color: "#555", marginBottom: "16px", textAlign: "left" }}>
  This tool is part of a capstone project for the <strong>UC Berkeley Master of Information and Data Science (MIDS)</strong> program. It was developed using publicly available data from the <strong>2022 Programme for International Student Assessment (PISA)</strong> and is intended for exploratory and educational use only.
  <br /><br />
  Predictions generated by this tool should not be interpreted as definitive assessments of student ability. They are based on statistical models trained on international survey data and are intended to provide general guidance and insight.
  <br /><br />
  By clicking "I Agree," you acknowledge that you understand the limitations of this tool and agree to use it accordingly.
</p>

                        <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setDisclaimerAccepted(true)}
                        >
                        I Agree
                        </Button>
                    </>
                    ) : (
                    <>
                    <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>{isAdminMode ? "EMRI Teacher / Administrator Mode" : "EMRI (Early Math Risk Identifier)"}</h1>
                    <p style={{ alignSelf: "flex-start", color: "#888", marginBottom: "8px" }}>
                    Question {Math.min(currentStep + 1, questions.length + 1)} of {questions.length + 1}
                    </p>
                    <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: "100%" }}
                    >
                    {currentStep < questions.length ? (
                    (() => {
                        const q = questions[currentStep];
                        console.log("Rendering question:", q, "with value:", answers[q.variable],  "on step:", currentStep);
                        return (
                            
                        <div key={currentStep} style={{ width: "100%", marginBottom: "16px" }}>
                            {q.context && (
                            <p style={{ fontStyle: "italic", color: "#777", marginBottom: "8px" }}>{q.context}</p>
                            )}
                            <p style={{ fontWeight: "bold" }}>{q.question}</p>
                            {Array.isArray(q.options) ? (
                            <FormControl fullWidth>
                            <InputLabel id={`label-${q.variable}`}>Select an option</InputLabel>
                            <Select
                              labelId={`label-${q.variable}`}
                              value={answers[q.variable]}
                              onChange={(e) => handleInputChange(q.variable, e.target.value)}
                            >
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
                            {/* ✅ Resubmit button shows only after initial submission */}
                            {hasSubmitted && (
                                <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSubmit}
                                >
                                    Resubmit
                                </Button>
                                </div>
                            )}
                        </div>
                        );
                    })()
                    ) : !showRecommendations && (
                        <>
                        <h3 style={{ marginBottom: "16px" }}>Summary</h3>
                        <table style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          marginBottom: "24px",
                          fontSize: "14px"
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f5f5f5" }}>
                              <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left" }}>Question</th>
                              <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left" }}>Answer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {questions.map((q, index) => (
                              <tr key={index}>
                                <td style={{ border: "1px solid #eee", padding: "8px" }}>{q.question}</td>
                                <td style={{ border: "1px solid #eee", padding: "8px" }}>{getDisplayAnswer(q)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                       
                      </>
                      
                    )}

                    </motion.div>
                    </AnimatePresence>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", width: "100%" }}>
                    <Button
                        variant="outlined"
                        disabled={currentStep === 0}
                        onClick={() => {
                            if (showRecommendations) {
                              setShowRecommendations(false);
                              setCurrentStep(questions.length); // Go back to the summary
                            } else {
                              setCurrentStep((prev) => prev - 1);
                            }
                          }}
                    >
                        Back
                    </Button>

                    {currentStep < questions.length - 1 ? (
                        <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setCurrentStep((prev) => prev + 1)}
                        >
                        Next
                        </Button>
                    ) : currentStep === questions.length - 1 ? (
                        <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setCurrentStep((prev) => prev + 1)}
                        >
                        Review
                        </Button>
                    ) : (
                        <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        >
                        Submit
                        </Button>
                    )}
                    </div>

                    {!isAdminMode && prediction !== null && !showRecommendations && (
                <h3 style={{ marginTop: "16px", fontSize: "18px", fontWeight: "bold", color: "#007bff" }}>
                    Predicted Math Proficiency: {prediction}
                </h3>
                )}

                {showRecommendations && (
                <>
                    <h2 style={{ marginBottom: "16px" }}>EMRI Nueral Net Model Results</h2>
                    {questions.filter(q =>
                    checkThreshold(q.recommendationThreshold, answers[q.variable])
                    ).length === 0 ?  (
                    <p>No specific recommendations based on your responses.</p>
                    ) : (
                        <>
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: "24px",
                        fontSize: "14px"
                    }}>
                        <thead>
                        <tr style={{ backgroundColor: "#f5f5f5" }}>
                            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Question</th>
                            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Your Answer</th>
                            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Recommendation</th>
                        </tr>
                        </thead>
                        <tbody>
                        {questions
                            .filter(q =>
                                checkThreshold(q.recommendationThreshold, answers[q.variable])
                              )
                            .map((q, index) => (
                            <tr key={index}>
                                <td style={{ border: "1px solid #eee", padding: "8px" }}>{q.question}</td>
                                <td style={{ border: "1px solid #eee", padding: "8px" }}>{getDisplayAnswer(q)}</td>
                                <td style={{ border: "1px solid #eee", padding: "8px" }}>{q.recommendationText}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
                    <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                        setCurrentStep(0);
                        setDisclaimerAccepted(false);
                        setShowRecommendations(false);
                        setPrediction(null);
                        setAnswers({});
                        setQuestions([]);
                        fetchCSVFromDrive(countryConfig[selectedCountry].csv); // Reload CSV
                    }}
                    >
                    Start Over
                    </Button>
                    </div>
                    </>
                    )}
                </>
                )}
                </>
                )}
                </CardContent>
            </Card>
        </div>
    );
}

export default App;