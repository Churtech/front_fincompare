<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# FinCompare — Institutional Intelligence Terminal

FinCompare es una terminal analítica de grado institucional diseñada para el inversionista colombiano. El sistema centraliza y audita productos financieros (CDTs, ETFs y Acciones), proporcionando métricas de riesgo y retorno real sincronizadas con el mercado.

## 🚀 Key Features

*   **Quantitative Engine:** Motor en Go calibrado para cálculos de Sharpe Ratio, Volatilidad Anualizada y Correlación de Pearson.
*   **Real Return (COP):** Análisis de poder adquisitivo basado en la Ecuación de Fisher, integrando inflación del DANE y TRM en tiempo real.
*   **Portfolio Intelligence:** Auditoría automática de diversificación que penaliza activos altamente correlacionados (ej. SPY vs VOO).
*   **Base 100 Analytics:** Gráficos de trayectorias normalizadas para comparativas justas entre activos de diferentes escalas y monedas.
*   **Institutional Sheet:** Generación de fichas técnicas para comités de inversión con proyecciones post-impuestos.

## 🛠️ Tech Stack

*   **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + ECharts.
*   **Backend:** Go (Gin Framework) + Clean Architecture.
*   **Engine:** Scrapers concurrentes para DANE, Banrep y APIs de mercados financieros.

## 💻 Run Locally

**Prerequisites:** Node.js v18+

1. Install dependencies:
   `npm install`
2. Set the `VITE_API_URL` (default: http://localhost:8080/api/v1) in `.env`
3. Run the app:
   `npm run dev`

---
*FinCompare · Institutional Asset Intelligence · 2026*
