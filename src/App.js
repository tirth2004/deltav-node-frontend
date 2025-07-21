import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const FEEDBACK_API_URL =
  "https://proxy-179385229806.europe-southwest1.run.app/generate";
const TRANSCRIBE_API_URL =
  "https://proxy-179385229806.europe-southwest1.run.app/generate-transcript";

function App() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingTranscription, setRecordingTranscription] = useState("");
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [fileTranscription, setFileTranscription] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [recordingResponse, setRecordingResponse] = useState("");
  const [fileResponse, setFileResponse] = useState("");

  const isRecordingSupported = !!window.MediaRecorder;

  // Start recording audio using MediaRecorder
  const startRecording = async () => {
    setRecordingResponse("");
    setRecordingTranscription("");
    setAudioChunks([]);
    setRecording(true);
    setRecordingLoading(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer webm, then ogg, then default
      let mimeType = "";
      let extension = "webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
        extension = "webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
        extension = "ogg";
      } else {
        mimeType = "";
        extension = "webm";
      }
      const recorder = mimeType
        ? new window.MediaRecorder(stream, { mimeType })
        : new window.MediaRecorder(stream);
      setMediaRecorder(recorder);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onstop = async () => {
        setRecording(false);
        setRecordingLoading(true);
        const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
        // Debug logs
        console.log(
          "Blob size:",
          audioBlob.size,
          "type:",
          audioBlob.type,
          "extension:",
          extension
        );
        const formData = new FormData();
        formData.append("file", audioBlob, `recording.${extension}`);
        try {
          const res = await fetch(TRANSCRIBE_API_URL, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          const transcription = data.transcription || "";
          console.log("Transcription:", transcription);
          // Send transcription to feedback API
          const feedbackRes = await fetch(FEEDBACK_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: transcription }),
          });
          const feedbackData = await feedbackRes.text();
          setRecordingResponse(feedbackData || "No result in response.");
        } catch (e) {
          setRecordingResponse("Error: " + e.message);
        } finally {
          setRecordingLoading(false);
        }
      };
      recorder.start();
    } catch (err) {
      alert("Could not start recording: " + err.message);
      setRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setRecording(false);
  };

  // File upload logic (unchanged)
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileTranscription("");
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setFileLoading(true);
    setFileTranscription("");
    setFileResponse("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(TRANSCRIBE_API_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const transcription = data.transcription || "";
      console.log("Transcription:", transcription);
      // Send transcription to feedback API
      const feedbackRes = await fetch(FEEDBACK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcription }),
      });
      const feedbackData = await feedbackRes.text();
      setFileResponse(feedbackData || "No result in response.");
    } catch (e) {
      setFileResponse("Error: " + e.message);
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif" }}
    >
      <h2>DeltaV Pitch AI</h2>
      <div>
        <h3>Record audio</h3>
        {isRecordingSupported ? (
          <button
            onClick={recording ? stopRecording : startRecording}
            style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
            disabled={recordingLoading}
          >
            {recording ? "Stop Recording" : "Start Recording"}
          </button>
        ) : (
          <div>
            Recording is not supported on your device/browser. Please use the
            file upload option.
          </div>
        )}
        {recordingLoading && (
          <span style={{ marginLeft: 12 }}>Processing...</span>
        )}
        {recordingResponse && (
          <div style={{ marginTop: 16 }}>
            <strong>Response:</strong>
            <div
              style={{
                border: "1px solid #eee",
                padding: 16,
                borderRadius: 4,
                background: "#fafafa",
                minHeight: 60,
              }}
            >
              <ReactMarkdown>{recordingResponse}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      <div
        style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #eee" }}
      >
        <h3>Upload MP3 file</h3>
        <input
          type="file"
          accept="audio/mp3,audio/webm,audio/ogg"
          onChange={handleFileChange}
          style={{ marginBottom: 8 }}
        />
        <button
          onClick={handleFileUpload}
          disabled={!file || fileLoading}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem", marginLeft: 8 }}
        >
          {fileLoading ? "Processing..." : "Generate feedback"}
        </button>
        {fileResponse && (
          <div style={{ marginTop: 16 }}>
            <strong>Response:</strong>
            <div
              style={{
                border: "1px solid #eee",
                padding: 16,
                borderRadius: 4,
                background: "#fafafa",
                minHeight: 60,
              }}
            >
              <ReactMarkdown>{fileResponse}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
