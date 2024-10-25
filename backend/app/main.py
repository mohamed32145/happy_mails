from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pickle
from dotenv import load_dotenv
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mail.google.com","chrome-extension://iamhflallddgcoipgmihmogjfjheldpi", "https://happy-mails.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_path = 'backend/app/data/email_classifier_model.h5'
model = load_model(model_path)

# Load the tokenizer
with open('backend/app/data/tokenizer.pkl', 'rb') as f:
    tokenizer = pickle.load(f)

# Define the request structure
class EmailContent(BaseModel):
    email_text: str

# Function to call OpenAI API
def improve_email_with_openai(email_text: str):
    api_key = os.getenv("OPENAI_API_KEY")  # Make sure this is set in your environment variables
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
    }
    payload = {
        'model': 'gpt-3.5-turbo',
        'messages': [
            {'role': 'system', 'content': 'You are an assistant that improves email content.'},
            {'role': 'user', 'content': f'Improve the following email content:\n\n{email_text}'},
        ],
        'max_tokens': 300,
    }
    
    response = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    return response.json().get('choices')[0]['message']['content'].strip()

# Placeholder function to simulate deep learning model
def should_improve_email(email_text: str) -> bool:
    new_email_seq = tokenizer.texts_to_sequences([email_text])
    new_email_padded = pad_sequences(new_email_seq, maxlen=model.input_shape[1])
    prediction = model.predict(new_email_padded)
    is_respectful = (prediction > 0.5).astype("int32")
    return not bool(is_respectful)

@app.get("/")
async def read_root():
    return {"message": "Welcome to the homepage!"}

# Route to process the email
@app.post("/process_email/")
def process_email(email: EmailContent):
    decision = should_improve_email(email.email_text)
    return {"improve": decision}

# Route to improve the email using OpenAI
@app.post("/improve_email/")
def improve_email(email: EmailContent):
    improved_content = improve_email_with_openai(email.email_text)
    return {"improved_content": improved_content}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
