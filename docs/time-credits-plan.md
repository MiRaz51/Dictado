# Sistema de Créditos de Tiempo (Diseño)

Este documento describe una propuesta para añadir un sistema de "Créditos de Tiempo" que los estudiantes acumulen por su desempeño en el modo individual, con opción de canjearlos por actividades acordadas con los adultos (por ejemplo: TV, consola, celular).

## Objetivos
- Motivar al estudiante mediante recompensas claras y controladas.
- Persistir créditos por alumno (isolados por alumno/curso).
- No requerir backend: funcionar 100% en navegador.
- Integración mínima y no invasiva con el código existente.

## Reglas para ganar créditos (versión actual)
- **Otorgamiento solo al finalizar el ejercicio.** Si un usuario no concluye el ejercicio, no se contabiliza nada (ni palabras acertadas ni bonos parciales).
- **Escala proporcional por dificultad y desempeño:**
  - Base de minutos al 100%: `TIME_CREDITS_MAX_BASE_AT_100` (default: 10 min).
  - Minutos finales = `%acierto * base` escalados por factores de dificultad:
    - Nivel: Básico=1.0, Intermedio=1.15, Avanzado=1.3, Experto=1.5.
    - Acentos activos: +15% (factor 1.15) si están habilitados.
    - Refuerzo de letras (0–100%): +0.3% por punto (factor `1 + porcentaje*0.003`, hasta +30%).
  - El producto de factores se limita a [1.0, 2.0] para evitar excesos.
- **Límites:**
  - Tope por ejercicio: 30 minutos (configurable).
  - Tope diario: 45 minutos (configurable).
  - De-duplicación por `exerciseId` para evitar otorgar el mismo ejercicio dos veces.

## Usos de los créditos (canjes)
- **Pantallas:** TV, consola, celular/tablet (categorías separadas para que el adulto elija).
- **Alternativas sin pantallas:** juego libre, elegir actividad familiar, lectura, comodín.
- **Granularidad:** 1 crédito = 1 minuto; canjes en bloques de 5/10/15 minutos.
- **Controles parentales:**
  - PIN de adulto para confirmar canje.
  - Motivo/nota al canjear (ej.: "ver TV").
  - Historial visible (día/semana) y opción de exportar.

## Integración técnica
- **Persistencia por alumno:** usar `getAlumnoCursoId()` ya existente en `assets/app.js` para construir la clave de almacenamiento. Ejemplo de clave: `timeCredits:{alumno|curso}` en `localStorage`.
- **Evento de otorgamiento:**
  - Solo al finalizar el ejercicio: tras calcular el porcentaje y antes/después de `Feedback.showFinalCongrats()`.
- **UI mínima:**
  - Badge con saldo en la cabecera de `index.html`.
  - Modal de canje (actividad + minutos + PIN adulto).
- **Anti-manipulación básica:**
  - Historial con checksum simple por entrada (disuasivo, no infalible).
  - En futuro, para modo grupal, la firma del tutor por PeerJS.

## API propuesta (módulo `modules/time-credits.js`)
- `TimeCredits.getBalance(alumnoId)` → `{ minutesAvailable, todayUsed, dailyLimit }`.
- `TimeCredits.award({ percent, exerciseId, reason?, customMinutes? })` → aplica reglas/topes; retorna minutos otorgados.
  - `customMinutes` permite inyectar minutos ya escalados según dificultad real (nivel/acentos/refuerzo). Si no se provee, se usan reglas por defecto.
- `TimeCredits.redeem({ activity, minutes, pin, note? })` → descuenta si hay saldo y valida límites; retorna nuevo saldo.
- `TimeCredits.getHistory({ limit? })` → últimas N transacciones.
- `TimeCredits.getToday()` → fecha `YYYY-MM-DD` y totales del día.

### Estructura de datos (en localStorage por alumno)
```json
{
  "minutesAvailable": 23,
  "dailyTotals": {
    "2025-10-10": { "awarded": 30, "redeemed": 7 }
  },
  "history": [
    { "id":"aw-abc", "type":"award", "minutes":10, "reason":"exercise_bonus_90", "exerciseId":"ex-123", "timestamp":"...", "checksum":"..." },
    { "id":"rd-xyz", "type":"redeem", "minutes":5, "activity":"tv", "note":"series", "timestamp":"...", "checksum":"..." }
  ],
  "awardedExercises": { "ex-123": true },
  "config": { "dailyLimit":45, "perExerciseLimit":30 }
}
```

## Puntos de enganche concretos en el código
- **Final de ejercicio individual (único punto de otorgamiento):**
  - Donde se calcula el porcentaje final y se llama a `showFinalCongrats(percent)`, invocar `TimeCredits.award({ customMinutes, exerciseId, percent, reason:'exercise_end_scaled' })`.
  - `customMinutes` se calcula con: `minutosBaseAl100 * (percent/100) * factorNivel * factorAcentos * factorRefuerzo` (clipeado a [1.0, 2.0] para el producto de factores), respetando límites internos.
- **Persistencia por alumno:**
  - Obtener `alumnoId` usando `getAlumnoCursoId()` (proporcionado por `assets/app.js`).

## UI (mínima)
- **Badge de saldo:** `#timeCreditsBadge` junto al título, mostrando minutos disponibles.
- **Modal de canje:** `#timeCreditsModal` con select de actividad, selector de minutos (validado contra saldo) y campo PIN.
- **Eventos:** listeners en `modules/init.js` para abrir/cerrar/canjear.

## Configurables (vía `window.CONFIG`)
- `TIME_CREDITS_ENABLED` (bool, default: true)
- `TIME_CREDITS_PIN` (string numérica, p. ej. `"1234"`)
- `TIME_CREDITS_DAILY_LIMIT` (número)
- `TIME_CREDITS_EXERCISE_LIMIT` (número)
- `TIME_CREDITS_MAX_BASE_AT_100` (número; minutos base al 100% antes de factores de dificultad)

## Roadmap de implementación
1. **PR1: Núcleo**
   - Crear `modules/time-credits.js` con API y persistencia en `localStorage` por alumno.
   - Lectura de `CONFIG` y topes. [Hecho]
2. **PR2: UI**
   - Añadir badge y modal a `index.html` + estilos en `assets/styles/components/time-credits.css`.
   - Listeners en `modules/init.js` para canje. [Hecho]
3. **PR3: Hook final del ejercicio**
   - Otorgamiento sólo al finalizar, con cálculo proporcional por dificultad. [Hecho]
4. **PR4: Afinación de pesos**
   - Ajustar `factorNivel`, `factorAcentos`, `factorRefuerzo` y `TIME_CREDITS_MAX_BASE_AT_100` según resultados en aula.

## Decisiones pendientes
- Minutos exactos por acierto/racha/bono y topes finales.
- Lista de actividades permitidas para canje y bloques (5/10/15).
- PIN de adulto predeterminado.

## Notas
- En modo grupal (futuro), los créditos podrían sincronizarse con el tutor vía PeerJS para evitar canjes fuera de supervisión.
- El sistema funciona offline; si se borra el almacenamiento del navegador, el saldo se pierde.
