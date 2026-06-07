# Local Setup Guide for ManuscriptForge

Since you are working on your Q1 paper, this guide will help you get the application running locally on your machine. This avoids cloud costs and keeps your data private.

## Step 1: Install MongoDB (The Database)
The app requires MongoDB to save your manuscripts and chat history.
1. Download **MongoDB Community Server** from: [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Install it using the default settings.
3. (Optional) Download **MongoDB Compass** (it's usually bundled) if you want to see your data in a visual window.

## Step 2: Setup the Backend (The Brain)
1. Open a terminal/command prompt and go to the backend folder:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment (to keep things clean):
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows**: `venv\Scripts\activate`
   - **Mac/Linux**: `source venv/bin/activate`
4. Install the required libraries:
   ```bash
   pip install -r requirements.txt
   ```
5. Create a file named `.env` in the `backend` folder and paste the following:
   ```env
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=scholarpen
   EMERGENT_LLM_KEY=your_actual_api_key_here
   JWT_SECRET=a_long_random_string_of_your_choice
   CORS_ORIGINS=http://localhost:3000
   ```
6. Start the backend server:
   ```bash
   uvicorn server:app --reload
   ```
   *The backend is now running at `http://localhost:8000`.*

## Step 3: Setup the Frontend (The Interface)
1. Open a **new** terminal window (keep the backend one running) and go to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a file named `.env` in the `frontend` folder and add this line:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```
4. Start the React app:
   ```bash
   npm start
   ```
   *The app should now open automatically in your browser at `http://localhost:3000`.*

## Troubleshooting
- **Backend not connecting to DB**: Ensure the MongoDB service is running in your Windows Services.
- **CORS Error**: Ensure `CORS_ORIGINS` in the backend `.env` matches the URL of your frontend (usually `http://localhost:3000`).
- **API Key**: If you get a 502 error during generation, double-check that your `EMERGENT_LLM_KEY` is correct.
