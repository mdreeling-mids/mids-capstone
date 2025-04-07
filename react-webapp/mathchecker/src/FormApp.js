import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import { useSearchParams } from "react-router-dom";
import { FaCalculator, FaChalkboardTeacher } from "react-icons/fa";
import { FaCheckCircle, FaInfoCircle } from "react-icons/fa";
import { Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Slider } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import CircularProgress from '@mui/material/CircularProgress';

const API_URL = "https://s389gubjia.execute-api.us-west-2.amazonaws.com/production/predict";
const ADMIN_API_URL = "https://placeholder-admin-endpoint.com/submit";

const debugPanelStyle = {
    width: "300px",
    maxHeight: "90vh",
    overflowY: "auto",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "16px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#333",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  };

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

    const [showDebug, setShowDebug] = useState(false);

    const [countryConfig, setCountryConfig] = useState({});
    const [selectedCountry, setSelectedCountry] = useState("United States");
    const [isLoading, setIsLoading] = useState(false);

    const [debugRightLog, setDebugRightLog] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [metrics, setMetrics] = useState({});

    const debugRight = (msg) => {
        setDebugRightLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      };

    useEffect(() => {
        async function loadConfig() {
          const config = await loadCountryConfigFromSheet(); // your async loader
          setCountryConfig(config);
        }
        loadConfig();
      }, []);

    async function loadCountryConfigFromSheet() {
        
        const SHEET_ID = '1ZyW4c0TLM8PvFI2iXCxbRugIOFM1_g97lWhSYa4RrH4';
        const GID = '0'; // usually 0 for the first sheet
        const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

      
        try {
            const response = await fetch(url);
            const text = await response.text();
            
            console.log('Raw text from cell A1:', text); // 👈 Add this
            
            const firstCell = text.split('\n')[0];
const cleaned = firstCell.replace(/^"|"$/g, '')  // remove outer quotes
                         .replace(/""/g, '"')    // unescape inner quotes
                         .trim();    
            console.log('Cleaned and fixed:', cleaned);
            const sanitized = cleaned.replace(/["']+\s*$/, '');  // removes trailing " or ' at end
            const config = JSON.parse(sanitized);
            
          console.log('Loaded config:', config);
          return config;
        } catch (error) {
          console.error('Failed to load or parse config:', error);
          return {};
        }
      }
      
    loadCountryConfigFromSheet().then(countryConfig => {
        const usModel = countryConfig["United States"].model;
        console.log("US model path:", usModel);
      });

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
    if (
      countryConfig &&
      Object.keys(countryConfig).length > 0 &&
      countryConfig[selectedCountry]
    ) {
      fetchCSVFromDrive(countryConfig[selectedCountry].csv);
      fetchMetricsFromDrive(countryConfig[selectedCountry].metrics);
    }
  }, [countryConfig, selectedCountry]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, [currentStep]);

    const fetchCSVFromDrive = (url) => {
    setIsLoading(true);

    if(!showDebug) {
      // Reset everything when country changes
      setHasSubmitted(false);
      setShowRecommendations(false);
      setPrediction(null);
      setCurrentStep(0);
      setAnswers({});
      setQuestions([]);
    }
    axios.get(url)
        .then(response => {
        parseCSV(response.data);
        })
        .catch(error => console.error("Error fetching CSV:", error))
        .finally(() => {
        setIsLoading(false);
        debugRight("CSV loaded");
        });
    };

    const fetchMetricsFromDrive = async (url) => {
      try {
        const response = await fetch(url);
        const text = await response.text();
        const [headerLine, valueLine] = text.trim().split("\n");
        const headers = headerLine.split(",");
        const values = valueLine.split(",");
    
        const metricsObj = {};
        headers.forEach((key, index) => {
          const value = parseFloat(values[index]);
          metricsObj[key] = isNaN(value) ? values[index] : value;
        });
    
        console.log("📊 Parsed metrics:", metricsObj);
        setMetrics(metricsObj);
        debugRight("✅ Metrics file parsed and loaded");
      } catch (error) {
        console.error("❌ Error loading metrics file:", error);
        debugRight("❌ Failed to load metrics");
      }
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

    useEffect(() => {
      if (showDebug && countryConfig[selectedCountry]?.csv) {
        fetchCSVFromDrive(countryConfig[selectedCountry].csv);
        debugRight("🔁 Debug mode enabled — reloading questions CSV.");
      }
    }, [showDebug]);

    const parseCSV = (csvData) => {
        Papa.parse(csvData, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (result) => {
                const parsedQuestions = [];
                const defaultAnswers = {};
                const variableOrder = [];
                
                let totalQuestions = result.data.length;
                let hiddenCount = 0;
                let adminOnlyCount = 0;

                result.data.forEach(row => {
                    if (row.Hide === "Yes") hiddenCount++;
                    if (row.Admin_Only === "Yes") adminOnlyCount++;

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

                debugRight(
                    `${totalQuestions} questions loaded from CSV. ` +
                    `${hiddenCount} marked as hidden, ` +
                    `${adminOnlyCount} marked as Admin Only.`
                  );
            }
        });
    };

    const handleInputChange = (variable, value) => {
        setAnswers(prev => ({ ...prev, [variable]: value }));
    };

    const handleSubmit = async () => {
        try {
          const modelName = countryConfig[selectedCountry]?.model || "unknown-model";
          const startTime = Date.now();
          debugRight(`🚀 Calling SageMaker multi-model endpoint for model [${modelName}] @ [${API_URL}]`);
            setIsSubmitting(true); // 🟡 show spinner

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
                        const countryCutoff = countryConfig[selectedCountry].cutoff;
                        const shouldShow = value < countryCutoff;
                        setShowRecommendations(shouldShow);
                        setHasSubmitted(true);
                        const duration = Date.now() - startTime;
                        debugRight(`✅ API call returned prediction: ${value} in ${duration} ms`);
                    } else {
                        console.error("⚠️ Prediction format invalid:", parsedPrediction);
                    }
                } else {
                    console.error("⚠️ No 'prediction' string in response:", rawPredictionBlock);
                }
            }
            
            
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsSubmitting(false); // ✅ hide spinner
        }
    };
    

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "24px", padding: "80px 30px 30px", minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
             <div style={{ position: "absolute", top: 20, right: 200 }}>
            <label style={{ fontSize: "14px", color: "#555" }}>
                <input
                type="checkbox"
                checked={showDebug}
                onChange={(e) => setShowDebug(e.target.checked)}
                style={{ marginLeft: "8px" }}
                />
                Show Debug Info
            </label>
            </div>
            {showDebug && (
            <div style={debugPanelStyle}>
                <h4 style={{ marginTop: 0, fontSize: "14px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>Useful Information & Variables</h4>
                {/* Notebook link */}
    {countryConfig[selectedCountry]?.notebook && (
      <p style={{ fontSize: "12px", marginBottom: "8px" }}>
        📓 Sample notebook:{" "}
        <a
          href={countryConfig[selectedCountry].notebook}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Notebook
        </a>
      </p>
    )}

    {/* S3 model link */}
    {countryConfig[selectedCountry]?.model && (
      <p style={{ fontSize: "12px", marginBottom: "8px" }}>
        📦 Model in S3:{" "}
        <a
          href={`https://sagemaker-us-west-2-986030204467.s3.us-west-2.amazonaws.com/pisa2022/multi_model_artifacts/${countryConfig[selectedCountry].model}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
      </p>
    )}

<div style={{ marginTop: "16px" }}>
    <h4 style={{ marginBottom: "8px" }}>📊 Evaluation Metrics</h4>
    <ul style={{ paddingLeft: "16px", fontSize: "12px" }}>
      {Object.entries(metrics).map(([key, value]) => (
        <li key={key}><strong>{key}</strong>: {value}</li>
      ))}
    </ul>
  </div>

    {/* CSV link */}
    {countryConfig[selectedCountry]?.csv && (
  (() => {
    const csvUrl = countryConfig[selectedCountry].csv;
    const sheetMatch = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = sheetMatch ? sheetMatch[1] : null;
    const sheetViewUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}` : null;

    return sheetViewUrl ? (
      <p style={{ fontSize: "12px", marginBottom: "8px" }}>
        📄 Question Config (Sheet):{" "}
        <a
          href={sheetViewUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Sheet
        </a>
      </p>
    ) : null;
  })()
)}
                <pre>{JSON.stringify({
            country: selectedCountry,
            step: currentStep,
            prediction,
            cutoff: countryConfig[selectedCountry]?.cutoff,
            answers,
            hasSubmitted,
            showRecommendations
            }, null, 2)}</pre>
            </div>
            )}
            <div style={{ position: "absolute", top: 20, left: 20 }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#555" }}>
                Loaded: {selectedCountry.replace(/_/g, ' ')}
            </span>
            </div>
            <div style={{ position: "absolute", top: 20, right: 20 }}>
                <FormControl variant="outlined" size="small">
                    <InputLabel>Choose Country</InputLabel>
                    <Select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                label="Choose Country"
            >
                {Object.keys(countryConfig).map((country) => (
                    <MenuItem key={country} value={country}>
                        {country}
                    </MenuItem>
                ))}
            </Select>
                </FormControl>
            </div>      
            {isLoading && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                <p style={{ fontWeight: "bold", marginBottom: "8px" }}>Loading question set...</p>
                <div className="spinner" />
            </div>
            )}
           <Card style={{ padding: "24px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)", maxWidth: "500px", width: "100%", borderRadius: "12px", backgroundColor: "#ffffff" }}>
           {isSubmitting && (
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                <CircularProgress color="primary" />
            </div>
            )}
           <CardContent style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {showDebug && questions.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", justifyContent: "center" }}>
                        {questions.map((q, index) => (
                          <button
                            key={index}
                            title={q.question}  // 🧠 this shows the tooltip
                            onClick={() => setCurrentStep(index)}
                            style={{
                              padding: "6px 10px",
                              fontSize: "12px",
                              borderRadius: "4px",
                              border: "1px solid #ccc",
                              backgroundColor: index === currentStep ? "#007bff" : "#f0f0f0",
                              color: index === currentStep ? "#fff" : "#333",
                              cursor: "pointer"
                            }}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    )}


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
  <strong>No personal information is stored when using this tool</strong>
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


                {showRecommendations && (
                <>  
                    <FaInfoCircle style={{ color: "#ffc107", fontSize: "32px", marginBottom: "12px" }} />
                    <h2 style={{ marginBottom: "16px" }}>EMRI Neural Net Model Results</h2>
                    <p style={{ fontSize: "15px", color: "#333", maxWidth: "400px", textAlign: "center" }}>
                    Our model believes that the answers provided may indicate a <strong><blue>lack of proficiency in math.</blue></strong> Below are the observations.
                    </p>
                    {showDebug && prediction !== null && (
                    <p style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: prediction < countryConfig[selectedCountry].cutoff ? "rgb(145, 6, 126)" : "#28a745",
                        marginBottom: "8px"
                      }}>
                        Predicted Math Proficiency Score: {(prediction * 100).toFixed(0)}%
                      </p>
                    )}
                    {showDebug && (
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
                    Cutoff for {selectedCountry}: {(countryConfig[selectedCountry].cutoff * 100).toFixed(0)}%
                    </p> 
                    )}
                    {questions.filter(q =>
                    checkThreshold(q.recommendationThreshold, answers[q.variable])
                    ).length === 0 ?  (
                    <p>There are no specific observations or recommendations based on your responses. This is not a cause for concern, it just means that the model did not receive enough information from the answers to be confident in recommendations</p>
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
                            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Observations</th>
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
                                <td style={{ border: "1px solid #eee", padding: "8px" }} dangerouslySetInnerHTML={{ __html: q.recommendationText }} />
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
                {hasSubmitted && prediction !== null && !showRecommendations && (
                <>  
                    <FaCheckCircle style={{ color: "#28a745", fontSize: "32px", marginBottom: "12px" }} />
                    <h2 style={{ marginBottom: "16px" }}>EMRI Neural Net Model Results</h2>
                    {showDebug && (<>
                    <p style={{ fontSize: "16px", fontWeight: "bold", color: "#007bff", marginBottom: "8px" }}>
                    Predicted Math Proficiency Score: {(prediction * 100).toFixed(0)}%
                    </p>
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
                    Cutoff for {selectedCountry}: {(countryConfig[selectedCountry].cutoff * 100).toFixed(0)}%
                    </p>    </>   )}
                    <p style={{ fontSize: "15px", color: "#333", maxWidth: "400px", textAlign: "center" }}>
                    There are no recommendations based on your answers as the prediction provided by the model indicates a proficiency in math.
                    </p>

                </>
                )}

                </>
                )}
                </CardContent>
            </Card>

            {showDebug && (
            <div style={debugPanelStyle}>
            <h4>Debug Log</h4>
            <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
  {debugRightLog.join("\n")}
</pre>
            </div>
            )}
        </div>
    );
}

export default App;