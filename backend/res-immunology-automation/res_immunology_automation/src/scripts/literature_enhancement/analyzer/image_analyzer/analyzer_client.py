import json
import re
import logging
import asyncio
from typing import Dict, Optional
import google.generativeai as genai
from pydantic import BaseModel
import os
from dotenv import load_dotenv  # Add this import
from ..retry_decorators import async_api_retry, PipelineStopException, ContinueToNextRecordException
import requests
from PIL import Image
from io import BytesIO

# Load environment variables from .env file
load_dotenv()

module_name = os.path.splitext(os.path.basename(__file__))[0].upper()
from literature_enhancement.config import LOGGING_LEVEL
logging.basicConfig(level=LOGGING_LEVEL)
logger = logging.getLogger(module_name)

class ImageDataModel(BaseModel):
    pmcid: str
    pmid: str
    disease: str
    target: str
    image_url: str
    image_caption: Optional[str] = None

class ImageDataAnalysisResult(BaseModel):   
    keywords: str
    insights: str
    genes: str
    drugs: str
    process: str
    error_message: Optional[str] = None
    status: str

class GeminiAnalyzer:
    """
    Simplified Gemini analyzer for biomedical image analysis
    Uses Google's Gemini 2.5 Flash multimodal API
    """
    
    def __init__(self, api_key: Optional[str] = None):
        # Debug: Print all environment variables to see what's available
        logger.info("=== DEBUGGING ENVIRONMENT VARIABLES ===")
        logger.info(f"Total env vars: {len(os.environ)}")
        
        # Print all env vars that contain 'KEY' (likely API keys)
        key_vars = {k: v[:10] + "..." if len(v) > 10 else v for k, v in os.environ.items() if 'KEY' in k.upper()}
        logger.info(f"Environment variables containing 'KEY': {key_vars}")
        
        # Print specific vars we're looking for
        logger.info(f"GEMINI_API_KEY from os.getenv: {os.getenv('GEMINI_API_KEY')}")
        logger.info(f"OPENAI_API_KEY from os.getenv: {os.getenv('OPENAI_API_KEY')}")
        
        # Check if any Google/Gemini related vars exist
        google_vars = {k: v[:10] + "..." if len(v) > 10 else v for k, v in os.environ.items() if 'GOOGLE' in k.upper() or 'GEMINI' in k.upper()}
        logger.info(f"Google/Gemini related vars: {google_vars}")
        
        # Try the working OpenAI pattern exactly
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        
        logger.info(f"Final api_key value: {'Found' if self.api_key else 'Not found'}")
        logger.info("=== END DEBUG ===")
        
        if not self.api_key:
            raise ValueError("Gemini API key not found in environment variables (GEMINI_API_KEY)")
            
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
    def get_system_prompt(self) -> str:
        """System prompt for biomedical analysis"""
        return """Extract biomedical information from this pathway image in 5 categories:

1. **genes**: Official human gene symbols only (HGNC format: PAH, TH, TPH1). Exclude metabolites, amino acids, proteins.
2. **drugs**: Pharmaceutical compounds, therapeutic agents only.
3. **keywords**: Disease names, metabolites, amino acids, techniques, biomarkers.
4. **process**: Main biological process (e.g., "phenylalanine metabolism").
5. **insights**: Brief clinical relevance visible in the image.

Rules: Extract only visible terms. Use "not mentioned" if empty. No guessing.

Return JSON:
{
"genes": "gene symbols or 'not mentioned'",
"drugs": "drug names or 'not mentioned'", 
"keywords": "medical terms or 'not mentioned'",
"process": "biological process or 'not mentioned'",
"insights": "clinical insights or 'not mentioned'"
}"""
        
    def get_user_prompt(self, caption: str) -> str:
        """User prompt with caption context"""
        context = f"Caption: {caption}" if caption and caption != "No caption provided" else "No caption context"
        return f"""Extract comprehensive biomedical information from this pathway image.

{context}

Return analysis in the exact JSON format specified."""

    async def _load_image_from_url(self, image_url: str) -> Image.Image:
        """Load image from URL with basic error handling"""
        logger.debug(f"Loading image from: {image_url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        # Add domain-specific headers
        if 'ncbi.nlm.nih.gov' in image_url:
            headers['Referer'] = 'https://www.ncbi.nlm.nih.gov/'
        elif 'europepmc.org' in image_url:
            headers['Referer'] = 'https://europepmc.org/'
        
        try:
            response = requests.get(image_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Convert to PIL Image
            image = Image.open(BytesIO(response.content))
            if image.mode != 'RGB':
                image = image.convert('RGB')
                
            logger.info(f"Successfully loaded image: {image.size}")
            return image
            
        except Exception as e:
            error_msg = f"Failed to load image: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    @async_api_retry(max_retries=2, base_delay=3.0, backoff_multiplier=2.0)
    async def _call_gemini_api(self, figure_data: ImageDataModel) -> Dict:
        """
        Core Gemini API call with retry logic
        """
        caption = figure_data.get("caption") or figure_data.get("image_caption", "No caption provided")
        pmcid = figure_data.get('pmcid', 'unknown')
        
        logger.info(f"Calling Gemini API for: {pmcid}")
        
        try:
            # Load image
            image = await self._load_image_from_url(figure_data["image_url"])
            
            # Prepare prompt
            system_prompt = self.get_system_prompt()
            user_prompt = self.get_user_prompt(caption)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content,
                [full_prompt, image],
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 8192,
                }
            )
            
            # Check response
            if response.prompt_feedback.block_reason:
                logger.error(f"Gemini blocked response for {pmcid}: {response.prompt_feedback.block_reason}")
                raise Exception(f"Content blocked: {response.prompt_feedback.block_reason}")
            
            if not response.candidates:
                logger.error(f"No response candidates for {pmcid}")
                raise Exception("No response generated")
            
            generated_text = response.candidates[0].content.parts[0].text
            logger.debug(f"Gemini response: {generated_text[:200]}...")
            
            return {
                "status": "success",
                "content": generated_text
            }
            
        except Exception as e:
            error_str = str(e).lower()
            
            # Check for rate limit/quota issues
            if any(indicator in error_str for indicator in ['quota', 'rate limit', 'too many requests']):
                logger.error(f"Rate limit for {pmcid}: {str(e)}")
                raise ContinueToNextRecordException(f"Rate limit: {str(e)}") from e
            
            # Check for authentication issues  
            if any(indicator in error_str for indicator in ['api key', 'unauthorized', 'authentication']):
                logger.error(f"Auth error for {pmcid}: {str(e)}")
                raise PipelineStopException(f"Authentication error: {str(e)}") from e
            
            # Re-raise other errors for retry
            raise

    async def analyze_content(self, figure_data: ImageDataModel) -> Dict:
        """
        Main analysis method with error handling
        """
        logger.info(f"Analyzing content for: {figure_data.get('pmcid', 'unknown')}")
        
        try:
            result = await self._call_gemini_api(figure_data)
            parsed = self.parse_analysis_response(result, figure_data)
            logger.info(f"Analysis completed for: {figure_data.get('pmcid', 'unknown')}")
            return parsed
            
        except ContinueToNextRecordException as e:
            # Timeout/rate limit - skip record
            logger.error(f"Skipping record due to: {str(e)}")
            return self._error_response("Gemini API timeout/rate limit", "analysis_timeout")
            
        except PipelineStopException as e:
            # Critical error - stop pipeline
            logger.error(f"Critical Gemini error: {str(e)}")
            raise RuntimeError(f"Gemini analysis failed: {str(e)}") from e
                        
        except Exception as e:
            # Unexpected error
            logger.error(f"Unexpected Gemini error: {str(e)}")
            raise RuntimeError(f"Unexpected Gemini error: {str(e)}") from e

    def parse_analysis_response(self, result: Dict, figure_data: Dict) -> Dict:
        """Parse Gemini response into database format"""
        extracted = {
            "keywords": "not mentioned",
            "insights": "not mentioned", 
            "genes": "not mentioned",
            "drugs": "not mentioned",
            "process": "not mentioned",
            "error_message": None,
            "status": "unknown"
        }

        pmcid = figure_data.get('pmcid', 'unknown')
        
        if result.get("status") == "success" and result.get("content"):
            # Try to parse JSON from content
            analysis = self._parse_json_from_string(result["content"], pmcid)
            
            if analysis and isinstance(analysis, dict):
                # Map fields from analysis to database format
                field_map = {
                    "genes": ["genes", "gene_symbols", "gene"],
                    "drugs": ["drugs", "drug_names", "medications"],
                    "keywords": ["keywords", "terms", "biomarkers"],
                    "process": ["process", "biological_process", "pathway"],
                    "insights": ["insights", "clinical_insights", "significance"]
                }
                
                found_fields = 0
                for db_field, api_fields in field_map.items():
                    for field in api_fields:
                        if field in analysis:
                            value = analysis[field]
                            if isinstance(value, list):
                                value = ", ".join([str(v).strip() for v in value if str(v).strip()])
                            extracted[db_field] = self._clean_field(str(value))
                            found_fields += 1
                            break
                
                if found_fields > 0:
                    extracted["status"] = "analyzed"
                    logger.info(f"Parsed {found_fields} fields for {pmcid}")
                else:
                    extracted["error_message"] = "No recognizable fields in response"
                    extracted["status"] = "analysis_error"
            else:
                extracted["error_message"] = "Failed to parse JSON response"
                extracted["status"] = "analysis_error"
        else:
            extracted["error_message"] = "Invalid response from Gemini"
            extracted["status"] = "analysis_error"

        return extracted

    def _parse_json_from_string(self, text: str, pmcid: str) -> Optional[Dict]:
        """Parse JSON from text with fallback strategies"""
        if not text or not isinstance(text, str):
            return None
        
        text = text.strip()
        
        # Try direct JSON parsing
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Remove markdown code blocks
        if text.startswith("```json") and text.endswith("```"):
            text = text[7:-3].strip()
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                pass
        
        # Find JSON with regex
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        
        logger.warning(f"Failed to parse JSON from response for {pmcid}")
        return None

    def _clean_field(self, field_value: str) -> str:
        """Clean and validate field values"""
        if not field_value or not isinstance(field_value, str):
            return "not mentioned"
        
        cleaned = field_value.strip()
        if not cleaned or cleaned.lower() in ["", "n/a", "none", "null", "not mentioned", "not available"]:
            return "not mentioned"
        
        # Remove quotes and clean up
        cleaned = re.sub(r'^["\']|["\']$', '', cleaned).strip()
        
        # Handle comma-separated values
        if ',' in cleaned:
            items = [item.strip() for item in cleaned.split(',') if item.strip()]
            unique_items = []
            seen = set()
            for item in items:
                if item.lower() not in seen and len(item) > 1:
                    unique_items.append(item)
                    seen.add(item.lower())
            
            return ", ".join(unique_items[:10]) if unique_items else "not mentioned"
        
        return cleaned if len(cleaned) > 1 else "not mentioned"

    def _error_response(self, error: str, status: str) -> Dict:
        """Return error response for analysis failures"""
        return {
            "keywords": "not mentioned",
            "insights": "not mentioned", 
            "genes": "not mentioned",
            "drugs": "not mentioned",
            "process": "not mentioned",
            "error_message": error,
            "status": status
        }