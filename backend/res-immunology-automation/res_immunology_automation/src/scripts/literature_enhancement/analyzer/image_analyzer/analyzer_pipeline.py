import asyncio
from typing import Dict
import sys
from literature_enhancement.analyzer.image_analyzer.openai_filter_client import OpenAIPathwayFilter
from literature_enhancement.analyzer.image_analyzer.analyzer_client import GeminiAnalyzer, ImageDataModel, ImageDataAnalysisResult
from literature_enhancement.analyzer.image_analyzer.gene_validator import validate_genes_async
import logging
import os

module_name = os.path.splitext(os.path.basename(__file__))[0].upper()
from literature_enhancement.config import LOGGING_LEVEL
logging.basicConfig(level=LOGGING_LEVEL)
logger = logging.getLogger(module_name)

class ThreeStageHybridAnalysisPipeline:
    """
    Three-stage hybrid analysis pipeline:
    Stage 1: OpenAI GPT-4o-mini caption filtering
    Stage 2: Gemini content analysis 
    Stage 3: Gene validation with NCBI
    """
    
    def __init__(self):
        self.openai_filter = OpenAIPathwayFilter()
        self.gemini_analyzer = GeminiAnalyzer()
    
    async def process_single_image(self, image_data: ImageDataModel) -> Dict:
        """
        Process a single image through the three-stage pipeline
        
        Args:
            image_data: Image data to process
            
        Returns:
            Dict with processing results
            
        Raises:
            RuntimeError: For critical errors that should stop the pipeline
        """
        pmcid = image_data.get("pmcid")
        caption = image_data.get("image_caption")
        
        logger.info(f"Starting analysis for PMCID: {pmcid}")
        
        # STAGE 1: OpenAI filtering
        try:
            logger.debug(f"Stage 1 - OpenAI filtering: {pmcid}")
            filter_result = self.openai_filter.filter_caption(caption)
            
            if filter_result.get("status") == "filter_timeout":
                # Timeout from OpenAI - continue to next record
                logger.warning(f"OpenAI filtering timed out for {pmcid} - skipping record")
                return {
                    "keywords": "not mentioned", "insights": "not mentioned", 
                    "genes": "not mentioned", "drugs": "not mentioned",
                    "process": "not mentioned", "is_disease_pathway": False,
                    "error_message": f"OpenAI filtering timeout: {filter_result.get('error_message')}",
                    "error_type": "OpenAI Timeout",
                    "status": "error"
                }
            
            if filter_result.get("status") == "filter_error":
                # Critical error from OpenAI - stop pipeline
                logger.error(f"OpenAI filtering failed critically for {pmcid}")
                return {
                    "keywords": "not mentioned", "insights": "not mentioned", 
                    "genes": "not mentioned", "drugs": "not mentioned",
                    "process": "not mentioned", "is_disease_pathway": False,
                    "error_message": f"OpenAI filtering failed: {filter_result.get('error_message')}",
                    "error_type": "OpenAI Parsing Error",
                    "status": "error"
                }
            
            if not filter_result.get("is_disease_pathway", False):
                logger.debug(f"Filtered out (not pathway): {pmcid}")
                return {
                    "keywords": "not mentioned", "insights": "not mentioned",
                    "genes": "not mentioned", "drugs": "not mentioned", 
                    "process": "not mentioned", "is_disease_pathway": False,
                    "error_message": None,
                    "error_type": None,
                    "status": "processed"
                }
            
            logger.info(f"Stage 1 passed: {pmcid}")
            
        except RuntimeError as e:
            logger.error(f"Stage 1 critical error: {pmcid} - {str(e)}")
            raise RuntimeError(f"OpenAI filtering failed critically: {str(e)}") from e
            
        except Exception as e:
            logger.error(f"Stage 1 unexpected error: {pmcid} - {str(e)}")
            raise RuntimeError(f"Unexpected Stage 1 error: {str(e)}") from e
        
        # STAGE 2: Gemini analysis
        try:
            logger.info(f"Stage 2 - Gemini analysis: {pmcid}")
            analysis_result = await self.gemini_analyzer.analyze_content(image_data)
            analysis_result["is_disease_pathway"] = True
            
            if analysis_result.get("status") == "analysis_timeout":
                # Timeout from Gemini - continue to next record
                logger.warning(f"Gemini analysis timed out for {pmcid} - skipping record")
                return {
                    "keywords": "not mentioned", "insights": "not mentioned",
                    "genes": "not mentioned", "drugs": "not mentioned",
                    "process": "not mentioned", "is_disease_pathway": True,
                    "error_message": f"Gemini analysis timeout: {analysis_result.get('error_message')}",
                    "error_type": "Gemini Timeout",
                    "status": "error"
                }
            
            if analysis_result.get("status") == "analyzed":
                analysis_result["status"] = "processed"
                analysis_result["error_message"] = None
                logger.info(f"Stage 2 completed: {pmcid}")

            elif analysis_result.get("status") == "analysis_error":
                # Analysis error from Gemini - stop pipeline
                logger.error(f"Gemini analysis failed critically for {pmcid}")
                raise RuntimeError(f"Gemini analysis failed: {analysis_result.get('error_message')}")
            else:
                logger.warning(f"Stage 2 partial completion: {pmcid} - status: {analysis_result.get('status')}")
            
        except RuntimeError as e:
            logger.error(f"Stage 2 critical error: {pmcid} - {str(e)}")
            raise RuntimeError(f"Gemini analysis failed critically: {str(e)}") from e
            
        except Exception as e:
            logger.error(f"Stage 2 unexpected error: {pmcid} - {str(e)}")
            raise RuntimeError(f"Unexpected Stage 2 error: {str(e)}") from e
        
        # STAGE 3: Gene validation
        genes_text = analysis_result.get("genes", "not mentioned")
        if genes_text and genes_text.lower() != "not mentioned":
            logger.info(f"Stage 3 - Gene validation: {pmcid}")
            try:
                validated_genes = await validate_genes_async(genes_text, delay=1.5)
                analysis_result["genes"] = validated_genes
                logger.info(f"Genes validated: {pmcid} -> {validated_genes}")
                
            except RuntimeError as e:
                logger.error(f"Stage 3 critical error: {pmcid} - {str(e)}")
                raise RuntimeError(f"Gene validation failed critically: {str(e)}") from e
                
            except Exception as e:
                logger.error(f"Stage 3 unexpected error: {pmcid} - {str(e)}")
                raise RuntimeError(f"Unexpected Stage 3 error: {str(e)}") from e
        else:
            logger.info(f"Stage 3 skipped - no genes: {pmcid}")
        
        return analysis_result