from typing import Optional
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

groq_client = Groq(api_key=os.getenv('GROQ_API_KEY', 'placeholder'))

class ClaudeService:
    def __init__(self):
      
        self.model_name = 'llama-3.3-70b-versatile'
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7
    ) -> str:
        try:
        
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
                
            messages.append({"role": "user", "content": prompt})
            
     
            response = groq_client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            raise e
    
    def generate_structured(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.0
    ) -> str:
       
        return self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=2048
        )


claude_service = ClaudeService()