import React, { useEffect, useRef, useState } from 'react';
import { Button, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';
import "./App.scss";

const App = (): React.ReactElement => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploading, setUploading] = useState(false);
  const [messageState, setMessageState] = useState<"success" | "error" | undefined>();
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Reference for the media recorder instance
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Effect to update the preview video source when there are recorded chunks
  useEffect(()=>{
    if (previewVideoRef.current && recordedChunks.length) {
      const recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
      previewVideoRef.current.src = URL.createObjectURL(recordedBlob);
    }
  },[recordedChunks]);

  // Effect to handle message dismissal after 5 seconds
  useEffect(() => {
    if(messageState){
      setTimeout(() => {
        setMessageState(undefined)
      },5000)
    }
  }, [messageState]);

  const handleStartRecording = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      // Assign stream to videoRef for playing video in video element
      videoRef.current.srcObject = stream;
      // Start media stream data when user start recording
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.start();
      setRecordedChunks([]);
    });
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      // To stop playing the video, clear the videoRef on stop recording for each track.
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  };

  // Function to handle data available during recording
  const handleDataAvailable = (e: BlobEvent) => {
    if (e.data.size > 0) {
      setRecordedChunks((prev) => prev.concat(e.data));
    }
  };

  const handleUpload = async () => {
    if(recordedChunks.length) {
      setUploading(true);
      const blob = new Blob(recordedChunks, {type: 'video/webm'});
      const formData = new FormData();
      formData.append('video', blob);
      try {
        await axios.post('http://localhost:3001/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        setMessageState("success");
        setRecordedChunks([]);
      } catch {
        setMessageState("error");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
      <div className="video-container">
        <h2>{recordedChunks.length ? "Recorded video" : "Webcam recorder"}</h2>
        {/* Render video while recording*/}
        <video className="video" controls ref={videoRef} style={{ display: videoRef?.current?.srcObject ? 'block' : 'none' }} autoPlay />
        {/* Render preview video after recording*/}
        <video className="video preview-video" controls ref={previewVideoRef} style={{ display: recordedChunks.length ? 'block' : 'none' }} />
        <Button variant="outlined" color="primary" disabled={!!videoRef?.current?.srcObject} onClick={handleStartRecording}>
          Start Recording
        </Button>
        <Button variant="outlined" disabled={!videoRef?.current?.srcObject} color="secondary" onClick={handleStopRecording}>
          Stop Recording
        </Button>
        <Button disabled={!recordedChunks.length || uploading} variant="contained" onClick={handleUpload}>
          {uploading && <CircularProgress size={20} style={{ marginRight: 5 }} />}
          Upload
        </Button>
        {messageState === "error" && <Alert severity="error">Error video uploading to Minio!</Alert>}
        {messageState === "success" && <Alert severity="success">Video uploaded successfully to Minio!</Alert>}
      </div>
  );
};

export default App;
