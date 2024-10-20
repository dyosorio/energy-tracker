import React, { useState } from 'react';
import '../styles/app.css';

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage('No file selected.');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage('File uploaded successfully.');
      } else {
        setMessage('Failed to upload file.');
      }
    } catch (error) {
      setMessage('An error occurred during file upload.');
    }
  };

  return (
    <div className="container file-upload-container">
      <form onSubmit={handleUpload}>
        <h2>Upload CSV</h2>
        
        <label className="custom-file-upload">
          <input type="file" onChange={handleFileChange} />
          Choose File
        </label>

        {selectedFile && (
          <p className="file-name">{selectedFile.name}</p>
        )}

        <button type="submit">Upload</button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

export default FileUpload;