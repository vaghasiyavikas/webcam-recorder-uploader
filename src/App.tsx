import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import axios from 'axios';
import "./App.css";

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null); // Added preview video reference
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  useEffect(()=>{
    if (previewVideoRef.current && recordedChunks.length) {
      const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
      previewVideoRef.current.src = URL.createObjectURL(recordedBlob);
    }
  },[recordedChunks])

  const handleStartRecording = () => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      videoRef.current.srcObject = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.start();
      setRecordedChunks([]);
    });
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleDataAvailable = (e: BlobEvent) => {
    if (e.data.size > 0) {
      setRecordedChunks((prev) => prev.concat(e.data));
    }
  };

  const handleUpload = async () => {
    if(recordedChunks.length) {
      const blob = new Blob(recordedChunks, {type: 'video/webm'});
      const formData = new FormData();
      formData.append('video', blob);

      try {
        await axios.post('http://localhost:3001/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        alert('Video uploaded successfully.');
        setRecordedChunks([])
      } catch (error) {
        alert('Failed to upload video.');
      }
    }
  };

  return (
      <div className="video-container">
        <h2>{recordedChunks.length ? "Recorded video" : "Webcam recorder"}</h2>
        <video className="video" controls ref={videoRef} style={{ display: videoRef?.current?.srcObject ? 'block' : 'none' }} autoPlay />
        <video className="video preview-video" controls ref={previewVideoRef} style={{ display: recordedChunks.length ? 'block' : 'none' }} />
        <Button variant="outlined" color="primary" disabled={!!videoRef?.current?.srcObject} onClick={handleStartRecording}>
          Start Recording
        </Button>
        <Button variant="outlined" disabled={!videoRef?.current?.srcObject} color="secondary" onClick={handleStopRecording}>
          Stop Recording
        </Button>
        <Button disabled={!recordedChunks.length} variant="contained" onClick={handleUpload}>
          Upload
        </Button>
      </div>
  );
};

export default App;
