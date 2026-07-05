import os
import json
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import Base, engine, get_db
import models
import google.generativeai as genai
from pydantic import BaseModel

app = FastAPI(title="ZeusPro AI Engine", version="1.0.0")

# Configuração da IA Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY and GEMINI_API_KEY != "sua_api_key_gratuita_do_google_ai_studio":
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash') # Modelo rápido e ideal para texto

class MessageRequest(BaseModel):
    contact_id: str
    message_text: str

@app.get("/")
def read_root():
    return {"status": "🚀 ZeusPro AI Engine está online e conectada!"}

@app.post("/api/ai/analyze-lead")
def analyze_lead(req: MessageRequest, db: Session = Depends(get_db)):
    """
    Recebe a mensagem de um lead, analisa com Gemini e atualiza o CRM (PostgreSQL).
    """
    # 1. Busca o contato no banco de dados relacional
    contact = db.query(models.Contact).filter(models.Contact.id == req.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contato não encontrado no CRM.")

    if not GEMINI_API_KEY or GEMINI_API_KEY == "sua_api_key_gratuita_do_google_ai_studio":
         raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada no .env")

    # 2. Prepara o prompt super estruturado para o Gemini
    prompt = f"""
    Você é um assistente sênior de CRM analisando uma mensagem de um cliente chamado {contact.name}.
    Mensagem do cliente no WhatsApp: "{req.message_text}"
    
    1. Qual é o sentimento dessa mensagem? (Positivo, Neutro ou Negativo)
    2. Gere um "lead score" de 0 a 100 indicando a probabilidade de venda ou urgência.
    3. Sugira uma resposta humanizada e persuasiva.
    
    Retorne APENAS um JSON estrito no seguinte formato:
    {{"sentimento": "...", "score": 80, "sugestao_resposta": "..."}}
    """
    
    try:
        # 3. Chama a IA
        response = model.generate_content(prompt)
        
        # 4. Limpa e processa o retorno
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        ai_data = json.loads(raw_text)
        
        # 5. Atualiza o banco de dados nativamente!
        contact.ai_sentiment_score = ai_data.get("score", 0)
        db.commit()
        db.refresh(contact)

        return {
            "sucesso": True,
            "contact_name": contact.name,
            "analise_ia": ai_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao processar IA: {str(e)}")