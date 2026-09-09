from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, purchase_orders, invoices, ai, comparisons, reports, dashboard, matching

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register routers
app.include_router(auth.router)
app.include_router(purchase_orders.router)
app.include_router(invoices.router)
app.include_router(ai.router)
app.include_router(comparisons.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(matching.router)


@app.get("/")
async def root():
    return {"message": "AI Invoice Matching System API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
