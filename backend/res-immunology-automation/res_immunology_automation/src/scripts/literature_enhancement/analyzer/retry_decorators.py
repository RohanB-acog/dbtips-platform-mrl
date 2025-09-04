#!/usr/bin/env python3
"""
Simplified retry decorators for API calls with exponential backoff
Handles different error types with appropriate pipeline stopping logic
Gemini-focused version without GPU memory handling
"""

import asyncio
import time
import logging
import functools
from typing import Callable
import httpx
import requests
import os
from literature_enhancement.config import LOGGING_LEVEL

logging.basicConfig(level=LOGGING_LEVEL)
module_name = os.path.splitext(os.path.basename(__file__))[0].upper()
logger = logging.getLogger(module_name)

class PipelineStopException(Exception):
    """Exception to stop the entire pipeline"""
    pass

class ContinueToNextRecordException(Exception):
    """Exception to skip current record and continue with next"""
    pass

def sync_api_retry(max_retries: int = 3, base_delay: float = 1.0, backoff_multiplier: float = 2.0):
    """
    Retry decorator for synchronous API calls (NCBI, OpenAI)
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds
        backoff_multiplier: Multiplier for exponential backoff
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                    
                except requests.exceptions.Timeout as e:
                    last_exception = e
                    if attempt == max_retries:
                        logger.error(f"API timeout after {max_retries} retries: {str(e)}")
                        raise ContinueToNextRecordException(f"API timeout after {max_retries} retries") from e
                    
                    delay = base_delay * (backoff_multiplier ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed with timeout, retrying in {delay}s: {str(e)}")
                    time.sleep(delay)
                    
                except (requests.exceptions.HTTPError, requests.exceptions.ConnectionError, 
                        requests.exceptions.RequestException) as e:
                    last_exception = e
                    if attempt == max_retries:
                        logger.error(f"API error after {max_retries} retries, stopping pipeline: {str(e)}")
                        raise PipelineStopException(f"API error after {max_retries} retries: {str(e)}") from e
                    
                    delay = base_delay * (backoff_multiplier ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}")
                    time.sleep(delay)
                    
                except Exception as e:
                    last_exception = e
                    if attempt == max_retries:
                        logger.error(f"Unexpected error after {max_retries} retries, stopping pipeline: {str(e)}")
                        raise PipelineStopException(f"Unexpected error after {max_retries} retries: {str(e)}") from e
                    
                    delay = base_delay * (backoff_multiplier ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed with unexpected error, retrying in {delay}s: {str(e)}")
                    time.sleep(delay)
            
            raise PipelineStopException(f"Maximum retries exceeded") from last_exception
            
        return wrapper
    return decorator

def async_api_retry(max_retries: int = 3, base_delay: float = 3.0, backoff_multiplier: float = 2.0):
    """
    Retry decorator for async API calls (Gemini)
    Simplified version without GPU memory handling
    
    Args:
        max_retries: Maximum number of retry attempts  
        base_delay: Base delay in seconds
        backoff_multiplier: Multiplier for exponential backoff
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                    
                except ContinueToNextRecordException:
                    # These should not be retried - pass through immediately
                    raise
                    
                except PipelineStopException:
                    # These should not be retried - pass through immediately
                    raise
                    
                except Exception as e:
                    last_exception = e
                    error_str = str(e).lower()
                    
                    # Check for rate limit issues - continue to next record
                    if any(indicator in error_str for indicator in 
                           ['rate limit', 'quota', 'too many requests']):
                        if attempt == max_retries:
                            logger.error(f"Rate limit after {max_retries} retries: {str(e)}")
                            raise ContinueToNextRecordException(f"Rate limit after {max_retries} retries") from e
                    
                    # Check for authentication issues - stop pipeline
                    elif any(indicator in error_str for indicator in 
                             ['api key', 'unauthorized', 'authentication', 'forbidden']):
                        logger.error(f"Auth error, stopping pipeline: {str(e)}")
                        raise PipelineStopException(f"Authentication error: {str(e)}") from e
                    
                    # For other errors, retry up to max_retries
                    else:
                        if attempt == max_retries:
                            logger.error(f"API error after {max_retries} retries: {str(e)}")
                            raise ContinueToNextRecordException(f"API error after {max_retries} retries") from e
                    
                    delay = base_delay * (backoff_multiplier ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
            
            # Should never reach here, but just in case
            raise ContinueToNextRecordException(f"Maximum retries exceeded") from last_exception
            
        return async_wrapper
    return decorator