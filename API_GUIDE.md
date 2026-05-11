# 🚀 FinCompare API Guide (Backend v1.0)

Esta guía documenta los endpoints de la API de FinCompare, optimizados para la Terminal de Inteligencia Institucional.

---

## 💼 Portafolios e IA Insights

### 1. Detalle de Portafolio y Métricas
**GET** `/portfolios/:id`

Devuelve las métricas cuantitativas anualizadas y el reporte de IA.

**Métricas Clave:**
- `expected_return`: Retorno anual esperado (%).
- `volatility`: Volatilidad anualizada (multiplicada por √252).
- `sharpe_ratio`: Eficiencia ajustada por riesgo (CAGR / Vol).
- `diversification_score`: Puntaje (0-100) penalizado por correlación de activos.

---

## 📈 Activos y Trayectorias

### 1. Historial de Precios Normalizado
**GET** `/assets/:ticker/history`

Serie histórica optimizada para comparativas híbridas.

**Campos Clave:**
- `normalized_price`: Valor base 100 (inicia en 100.0 el primer día del rango).
- `price_cop`: Precio del activo convertido a COP con la TRM histórica de cada fecha.
- `change_pct`: Variación porcentual diaria.

---

## 🏦 Mercado y Referencias

### 1. Métricas Globales
**GET** `/metrics`

**Estructura del Data Object:**
```json
{
  "data": {
    "cdt_average_90d": 11.2,
    "cdt_average_180d": 11.4,
    "cdt_average_360d": 11.5,
    "inflation_rate": 5.68,
    "trm_current": 3747.10
  }
}
```

### 2. CDTs y Rendimiento Real
**GET** `/cdts`

El backend calcula automáticamente el `real_return` aplicando la ecuación de Fisher sobre la tasa neta y la inflación vigente.

---

## 🛠️ Notas de Integración Frontend

1. **Escala de Tasas:** Todos los campos porcentuales se envían como flotantes (ej. `5.68` para 5.68%).
2. **Backtesting:** Para simulaciones en pesos, priorizar el campo `price_cop` de la serie histórica.
3. **Manejo de Errores:** El API sigue el estándar de `skill-errors` con mensajes claros y códigos de estado HTTP semánticos.

---
*FinCompare · API Spec v1.0 · 2026*
