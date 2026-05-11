# FinCompare — Guía de Arquitectura Técnica

> Comparador Institucional de Activos: CDTs • ETFs • Acciones  
> Versión 2.0 — Mayo 2026 (Actualización de Inteligencia Cuantitativa)

---

## Tabla de Contenido

1. [Visión General](#1-visión-general-del-proyecto)
2. [Motor Cuantitativo y Lógica Financiera](#2-motor-cuantitativo-y-lógica-financiera)
3. [Estrategia de Datos y Scraping](#3-fuentes-de-datos-y-estrategia-de-scraping)
4. [Normalización y Visualización](#4-normalización-y-visualización)
5. [Arquitectura del Sistema](#5-arquitectura-del-sistema)

---

## 1. Visión General del Proyecto

FinCompare ha evolucionado de un comparador de tasas a una **Terminal de Inteligencia Institucional**. El sistema no solo centraliza datos, sino que audita el riesgo y el rendimiento real de las inversiones en el contexto colombiano (COP + Inflación + TRM).

---

## 2. Motor Cuantitativo y Lógica Financiera

El corazón del sistema reside en el motor de cálculo en Go, calibrado para estándares institucionales.

### 2.1 Rendimiento Real (Ecuación de Fisher)
Para garantizar la veracidad del poder adquisitivo, el sistema aplica la Ecuación de Fisher en lugar de una resta simple.
- **Fórmula:** `r_real = ((1 + r_nominal) / (1 + h)) - 1`
- Donde `r_nominal` es la tasa neta post-impuestos y `h` es la inflación reportada por el DANE.
- **Uso:** Determina si una inversión realmente está batiendo al costo de vida en Colombia.

### 2.2 Volatilidad Anualizada (Regla √252)
La volatilidad reportada en portafolios y activos se escala de diaria a anual para permitir comparaciones con las tasas E.A. de los CDTs.
- **Fórmula:** `σ_anual = σ_diaria * √252`
- **Impacto:** Corrige la subestimación del riesgo en activos de renta variable.

### 2.3 Inteligencia de Portafolios y Diversificación
El motor audita la calidad de la diversificación usando la **Matriz de Correlación de Pearson**.
- **Penalización por Correlación:** El `diversification_score` se castiga drásticamente si los activos presentan una correlación superior a **0.7**. 
- **Escenario SPY/VOO:** Dos activos con correlación > 0.99 resultan en un score de diversificación cercano a 0, alertando sobre el riesgo de concentración.

---

## 3. Fuentes de Datos y Estrategia de Scraping

### 3.1 Sincronización Automática (DANE & TRM)
- **IPC:** El sistema realiza scraping automático del portal del DANE para obtener la inflación anualizada vigente.
- **TRM:** Sincronización diaria con el Banrep para conversiones precisas de `price_cop`.

### 3.2 Histórico en Pesos (Fase 3)
Cada punto histórico de un activo en USD se almacena con su equivalente `price_cop` calculado con la TRM de esa fecha exacta, permitiendo realizar backtesting real en moneda local.

---

## 4. Normalización y Visualización

### 4.1 Series Base 100
Para comparar activos con escalas radicalmente distintas (ej. SPY a $500 USD vs CDT al 11%), el backend genera series normalizadas:
- **Lógica:** El primer punto de la serie (T-30 días o inicio de rango) se fija en 100.
- **Visualización:** El frontend interpreta esto como **Retorno Porcentual Acumulado**, iniciando siempre en 0% (T=0).

### 4.2 Scatter Plot de Riesgo vs Retorno
- **Metadata Enriquecida:** Los DTOs de contribución incluyen Ticker y Nombre para identificación inmediata.
- **Benchmark Dinámico:** El gráfico integra una `markLine` con la tasa del mejor CDT disponible, sirviendo como umbral de "Costo de Oportunidad".

---

## 5. Arquitectura del Sistema

El sistema mantiene su arquitectura Hexagonal / Clean Architecture, separando rigurosamente los adaptadores de scraping del dominio de cálculo financiero.

```go
// Ejemplo de lógica core corregida
func CalculateSharpeRatio(returns []float64, riskFreeRate float64) float64 {
    cagr := CalculateCAGR(returns)
    vol  := CalculateAnnualizedVol(returns)
    return (cagr - riskFreeRate) / vol
}
```

---
*FinCompare · Documentación Técnica v2.0 · Mayo 2026*
