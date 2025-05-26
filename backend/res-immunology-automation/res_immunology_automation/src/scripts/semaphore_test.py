from fastapi import FastAPI
import asyncio
import uvicorn

app_test = FastAPI()

# Create a semaphore with a limit of 1
semaphore = asyncio.Semaphore(1)

@app_test.get("/semaphore/{inp}")
async def handle_request(inp):
    async with semaphore:  # This will block concurrent requests
        print(f"lock applied and processing {inp}")
        await asyncio.sleep(30)  # Simulate a long task
        print("Lock released after processing")
        return {"message": "Request handled"}
    
if __name__ == "__main__":
    uvicorn.run(app_test, host="0.0.0.0", port=8000, workers=20)

