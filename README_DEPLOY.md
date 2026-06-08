# Deployment Guide for ManuscriptForge

Since this is a full-stack application with a Python backend and a React frontend, the best free-tier setup is using **Render**, **Vercel**, and **MongoDB Atlas**.

## 1. Database: MongoDB Atlas (Free)
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a **Shared Cluster** (M0 - Free).
3. In **Network Access**, allow access from `0.0.0.0/0` (since Render's free tier doesn't provide static IPs).
4. Create a **Database User** and password.
5. Click **Connect** $\rightarrow$ **Connect your application** to get your `MONGO_URL` (e.g., `mongodb+srv://<user>:<password>@cluster...`).

## 2. Backend: Render (Free)
1. Create a free account at [render.com](https://render.com).
2. Connect your GitHub repository.
3. Create a new **Web Service**.
4. **Settings**:
   - **Runtime**: `Docker`
   - **Plan**: `Free`
5. **Environment Variables**: Add the following in the Render dashboard:
   - `MONGO_URL`: Your MongoDB Atlas connection string.
   - `DB_NAME`: `manuscriptforge` (or any name you prefer).
   - `EMERGENT_LLM_KEY`: Your AI API key.
   - `JWT_SECRET`: A long random string (e.g., `your-super-secret-key-123`).
   - `CORS_ORIGINS`: The URL Vercel gives you (e.g., `https://scholarpennew.vercel.app`).

## 3. Frontend: Vercel (Free)
1. Create a free account at [vercel.com](https://vercel.com).
2. Connect your GitHub repository.
3. **Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Create React App`
4. **Environment Variables**:
   - `REACT_APP_BACKEND_URL`: The URL Render gives you (e.g., `https://manuscript-forge-backend.onrender.com`).
5. Deploy.

## 4. Final Step: Update CORS
Once Vercel gives you the frontend URL, go back to the **Render Backend** settings and update `CORS_ORIGINS` to match it exactly. Then restart the backend service.
