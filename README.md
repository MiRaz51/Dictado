# 📝 Práctica de Ortografía

Una aplicación web interactiva para practicar ortografía en español mediante dictado de palabras con síntesis de voz.

## 🌟 Características

- **Dictado interactivo**: Síntesis de voz para reproducir palabras
- **Múltiples niveles de dificultad**: Fácil, Medio y Difícil
- **Filtros personalizables**: Por letras específicas (b, v, rr, ll, etc.)
- **Modo estricto**: Validación con diccionario Hunspell español
- **Reportes detallados**: Generación de PDF con resultados
- **Práctica manual**: Exportación para ejercicios en papel
- **Interfaz responsive**: Optimizada para escritorio
- **Caché inteligente**: Almacenamiento local para mejor rendimiento

## 🎯 Funcionalidades Principales

### Configuración de Ejercicios
- **Participante y Curso**: Identificación del usuario
- **Cantidad de palabras**: Configurable (por defecto 50)
- **Filtros por letras**: Enfoque en letras específicas o combinaciones
- **Acentos obligatorios**: Opción para mayor dificultad
- **Modo estricto**: Validación con diccionario RAE/Hunspell

### Niveles de Dificultad
- **🌱 Nivel Fácil**: Palabras básicas (3-5 letras)
- **🌿 Nivel Medio**: Palabras intermedias (4-7 letras)
- **🌳 Nivel Difícil**: Palabras avanzadas (5-15 letras)

### Filtros de Letras Disponibles
- **Letras individuales**: b, v, g, j, c, z, s, h, x, y, w
- **Dígrafos**: ll, rr, ch, qu, gu, gü
- **Grupos consonánticos**: br, bl, cr, cl, dr, fl, fr, gl, gr, pl, pr, tr
- **Combinaciones ortográficas**: cc, sc, xc, mp, mb, nv, nf, nm

### Reportes y Análisis
- **Progreso en tiempo real**: Barra de avance y estadísticas
- **Reporte PDF**: Resumen completo con detalles de cada intento
- **Práctica manual**: Lista de palabras para ejercicios offline
- **Significados**: Definiciones automáticas para palabras incorrectas

## 🚀 Instalación y Uso

### Requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet (para cargar diccionarios y librerías)
- **Importante**: Diseñado exclusivamente para computadoras de escritorio

### Archivos del Proyecto
```
├── index.html              # Página principal
├── app.js                  # Lógica de la aplicación
├── styles.css              # Estilos y diseño
├── palabras_todas_no_conjugaciones.txt  # Diccionario RAE
└── README.md               # Este archivo
```

## 🎮 Cómo Usar

Acceder al siguiente link https://miraz51.github.io/Dictado/

### 1. Configuración Inicial
- Ingresa el nombre del participante
- Especifica el curso o grupo
- Configura la cantidad de palabras (opcional)
- Selecciona letras específicas a reforzar (opcional)
- Activa acentos obligatorios si deseas mayor dificultad

### 2. Selección de Nivel
- Elige entre Fácil, Medio o Difícil según tu nivel
- Cada nivel tiene palabras apropiadas para la dificultad

### 3. Práctica
- Haz clic en "🔊 Reproducir palabra" para escuchar
- Escribe la palabra en el campo de texto
- Presiona "Comprobar" para validar tu respuesta
- Continúa hasta completar todas las palabras

### 4. Resultados
- Revisa tu puntuación y estadísticas
- Descarga el reporte PDF completo
- Genera una práctica manual para ejercicios offline

## 🔧 Características Técnicas

### Tecnologías Utilizadas
- **HTML5**: Estructura semántica
- **CSS3**: Diseño moderno y responsive
- **JavaScript ES6+**: Lógica de aplicación
- **Web Speech API**: Síntesis de voz
- **Hunspell**: Validación ortográfica
- **jsPDF**: Generación de reportes PDF
- **LocalStorage**: Caché de datos

### APIs y Librerías Externas
- **Typo.js**: Wrapper de Hunspell para JavaScript
- **jsPDF + AutoTable**: Generación de PDFs
- **HTML2Canvas**: Captura de elementos HTML
- **LibreOffice Dictionaries**: Diccionarios Hunspell español

### Funciones Avanzadas
- **Caché inteligente**: TTL de 30 días para diccionarios
- **Validación multimodal**: RAE + Hunspell + patrones locales
- **Búsqueda de significados**: Wikipedia + APIs de diccionarios
- **Navegación por teclado**: Soporte completo con Enter/Tab
- **Modo offline**: Funcionalidad básica sin conexión


## 🐛 Solución de Problemas

### Audio no funciona
- Haz clic en "Permitir audio" si aparece el botón
- Verifica que el navegador tenga permisos de audio
- Prueba en modo incógnito si hay problemas de caché

### Palabras no se cargan
- Verifica la conexión a internet
- Revisa la consola del navegador (F12) para errores
- Limpia el caché del navegador si es necesario

### PDF no se genera
- Asegúrate de que las librerías jsPDF estén cargadas
- Verifica que hay resultados de práctica disponibles
- Revisa los permisos de descarga del navegador

## 📝 Licencia

Este proyecto está desarrollado por **GMR 2025** para uso educativo.

## 🤝 Contribuciones

Para reportar problemas o sugerir mejoras:
1. Documenta el problema detalladamente
2. Incluye pasos para reproducir el error
3. Especifica navegador y versión utilizada

## 📞 Soporte

Para soporte técnico o consultas educativas, contacta al desarrollador a través de los canales oficiales del proyecto.

---

**Nota**: Esta aplicación está optimizada para computadoras de escritorio y portátiles. No se recomienda su uso en dispositivos móviles debido a las interferencias del corrector automático.
