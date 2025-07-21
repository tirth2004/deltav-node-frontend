
import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = "https://proxy-179385229806.europe-southwest1.run.app/generate";
const TRANSCRIBE_URL = "http://localhost:5001/transcribe";

function App() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const recognitionRef = useRef(null);
  const recordingRef = useRef(false);

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript((prev) => (prev ? prev + " " + text : text));
    };
    recognition.onerror = (event) => {
      alert("Speech recognition error: " + event.error);
    };
    recognition.onend = () => {
      if (recordingRef.current) {
        recognition.start();
      } else {
        setRecording(false);
      }
    };

    recognitionRef.current = recognition;
    recordingRef.current = true;
    recognition.start();
    setRecording(true);
    setTranscript("");
    setResponse("");
  };

  const stopRecording = () => {
    recordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
  };

  const sendToApi = async () => {
    if (!transcript) return;
    setResponse("Loading...");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
      const data = await res.json();
      setResponse(data.result || "No result in response.");
    } catch (e) {
      setResponse("Error: " + e.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setResponse("Transcribing audio file...");
    setTranscript("");
    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.transcript) {
        console.log("Transcript:", data.transcript);
        setTranscript(data.transcript);
        setResponse("Transcript generated. Sending to model...");

        const mlRes = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.transcript }),
        });
        const mlData = await mlRes.json();
        setResponse(mlData.result || "No result in response.");
      } else {
        setResponse("No transcript returned.");
      }
    } catch (err) {
      setResponse("Error during transcription: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>DeltaV Pitch AI</h2>

      <button
        onClick={recording ? stopRecording : startRecording}
        style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>

      <div style={{ margin: "1rem 0" }}>
        <strong>Upload Audio File:</strong>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          style={{ marginTop: 8 }}
        />
      </div>

      <div style={{ margin: "1rem 0" }}>
        <strong>Transcript:</strong>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          style={{
            minHeight: 40,
            width: "100%",
            border: "1px solid #ccc",
            padding: 8,
            borderRadius: 4,
            resize: "vertical",
            fontSize: "1rem",
          }}
          placeholder="Your transcript will appear here. You can edit it before submitting."
        />
      </div>

      <button
        onClick={sendToApi}
        disabled={!transcript || recording}
        style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
      >
        Get Feedback
      </button>

      <div style={{ marginTop: 24 }}>
        <strong>Response:</strong>
        <div
          style={{
            border: "1px solid #eee",
            padding: 16,
            borderRadius: 4,
            background: "#fafafa",
            minHeight: 100,
          }}
        >
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default App;

