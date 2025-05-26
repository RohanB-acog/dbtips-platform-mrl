FROM python:3.11

WORKDIR /app

COPY backend/res-immunology-automation /app/res-immunology-automation
# COPY graphRAG /app/graphRAG
# COPY redis /app/redis

# COPY requirements.txt .
# COPY llmfactory-0.1.0-py3-none-any.whl .

# #Download GWAS associations data
# WORKDIR /app/res-immunology-automation/res_immunology_automation/src/gwas_data
# RUN wget -O  associations.tsv https://www.ebi.ac.uk/gwas/api/search/downloads/alternative

# WORKDIR /app
# # Update the package manager and install SQLite
# RUN apt-get update && apt-get install -y sqlite3

# RUN pip install -r requirements.txt
# RUN pip install llmfactory-0.1.0-py3-none-any.whl
RUN pip install uvicorn fastapi 
WORKDIR /app/res-immunology-automation/res_immunology_automation/src/scripts

CMD ["uvicorn", "semaphore_test:app_test", "--host", "0.0.0.0", "--port", "8000", "--reload"]
