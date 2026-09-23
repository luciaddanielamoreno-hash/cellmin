from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_db, close_db
from app.routers import (
    auth, users, categories, products,
    clients, suppliers, stock, purchases,
    sales, cash_register, repairs, reports, backup
)
from app.routers import repair_types
from app.routers import audit

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="Sistema de Ventas y Stock",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/auth",        tags=["Auth"])
app.include_router(users.router,         prefix="/api/users",       tags=["Usuarios"])
app.include_router(categories.router,    prefix="/api/categories",  tags=["Categorías"])
app.include_router(products.router,      prefix="/api/products",    tags=["Productos"])
app.include_router(clients.router,       prefix="/api/clients",     tags=["Clientes"])
app.include_router(suppliers.router,     prefix="/api/suppliers",   tags=["Proveedores"])
app.include_router(stock.router,         prefix="/api/stock",       tags=["Stock"])
app.include_router(purchases.router,     prefix="/api/purchases",   tags=["Compras"])
app.include_router(sales.router,         prefix="/api/sales",       tags=["Ventas"])
app.include_router(cash_register.router, prefix="/api/cash",        tags=["Caja"])
app.include_router(repairs.router,       prefix="/api/repairs",     tags=["Reparaciones"])
app.include_router(reports.router,       prefix="/api/reports",     tags=["Reportes"])
app.include_router(backup.router,        prefix="/api/backup",      tags=["Backup"])
app.include_router(repair_types.router, prefix="/api/repair-types", tags=["Tipos de Reparación"])
app.include_router(audit.router, prefix="/api/audit", tags=["Auditoría"])

@app.get("/")
async def root():
    return {"message": "Sistema de Ventas API funcionando ✅"}