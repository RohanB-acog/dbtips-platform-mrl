from typing import *
from collections import defaultdict
import json
import requests
import os
import time
from fastapi import HTTPException

NCBI_API_KEY = os.getenv('NCBI_API_KEY')
RATE_LIMIT_RETRY_PERIOD = 300
EMAIL = os.getenv('NCBI_EMAIL')


def get_data_from_pubmed(url, params):
    try:
        response = requests.get(url, params=params)
        if response.status_code != 200:
            print("An error occurred with NCBI: ", response.status_code)
        if response.status_code == 429:
            # raise Exception("Too Many Requests: You are being rate-limited. Please try again later.")
            rate_limited_until = time.time() + RATE_LIMIT_RETRY_PERIOD
            raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Try again after {RATE_LIMIT_RETRY_PERIOD} seconds.")

        time.sleep(0.1)  # Add a delay of 0.4 seconds between requests
        response.raise_for_status()
        return response
    except Exception as e:
        raise e