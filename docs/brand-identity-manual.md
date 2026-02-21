# Manual de Identidad de Marca
## AI Film Studio

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Uso:** Documento oficial para mantener coherencia visual y comunicacional

---

## Índice

1. [Esencia de Marca](#esencia-de-marca)
2. [Identidad Visual](#identidad-visual)
3. [Tipografía](#tipografía)
4. [Paleta de Color](#paleta-de-color)
5. [Logo y Símbolo](#logo-y-símbolo)
6. [Elementos Gráficos](#elementos-gráficos)
7. [Voz y Tono](#voz-y-tono)
8. [Aplicaciones](#aplicaciones)
9. [Usos Prohibidos](#usos-prohibidos)

---

## 1. Esencia de Marca

### Propósito
**"Amplificar la visión creativa de cada director, fotógrafo y productor."**

AI Film Studio no reemplaza la creatividad humana; la potencia. Somos el asistente invisible que traduce ideas en imágenes cinematográficas, devolviendo tiempo a los creativos para enfocarse en lo que realmente importa: contar historias.

### Valores de Marca

**🎬 Creatividad Primero**  
La tecnología sirve a la visión creativa, nunca al revés.

**🤝 Colaboración Humana**  
Somos una herramienta colaborativa, no un reemplazo.

**✨ Excelencia Cinematográfica**  
Cada frame debe sentirse profesional y cinematográfico.

**🚀 Accesibilidad Profesional**  
Herramientas de estudio para creativos de todos los niveles.

**💡 Intuición sobre Complejidad**  
La mejor tecnología es invisible; solo queda la magia.

### Personalidad de Marca

| Somos | No somos |
|-------|----------|
| Inspiradores | Pretenciosos |
| Colaborativos | Invasivos |
| Cinematográficos | Corporativos |
| Humanos | Robóticos |
| Profesionales | Elitistas |
| Visionarios | Complicados |

### Audiencia Principal

**Profesionales Creativos:**
- Directores de cine independientes (25-45 años)
- Fotógrafos comerciales y artísticos
- Productores de contenido audiovisual
- Creativos publicitarios
- Cineastas emergentes

**Perfil Psicográfico:**
- Apasionados por la narrativa visual
- Valoran la calidad sobre la cantidad
- Buscan eficiencia sin sacrificar control creativo
- Están abiertos a nuevas herramientas que respeten su visión
- Prefieren colaboradores sobre automatización

---

## 2. Identidad Visual

### Estética General

**"Cinematografía Oscura con Destellos de Inspiración"**

Nuestra identidad visual combina:
- **Base oscura y sofisticada** (como una sala de cine o suite de edición)
- **Acentos vibrantes** (que representan la chispa creativa)
- **Glassmorphism sutil** (modernidad sin frialdad)
- **Texturas orgánicas** (humanidad en lo digital)

### Principios de Diseño

1. **Espacio Negativo Generoso**  
   El contenido respira. Nunca saturar la composición.

2. **Jerarquía Clara**  
   Guiar la mirada con contraste y escala, no con ruido visual.

3. **Movimiento Sutil**  
   Animaciones suaves que añaden vida sin distraer.

4. **Profundidad Cinematográfica**  
   Uso de capas, blur y sombras para crear dimensión.

5. **Precisión en Detalles**  
   Cada borde redondeado, cada sombra, cada espaciado es intencional.

---

## 3. Tipografía

### Familia Tipográfica Principal

**Sans-Serif Moderna** (Sistema por defecto o Inter/Outfit)

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
             "Inter", "Outfit", sans-serif;
```

### Jerarquía Tipográfica

#### Títulos Principales (H1)
```css
font-size: 3rem (48px);
font-weight: 900 (Black);
text-transform: uppercase;
font-style: italic;
letter-spacing: -0.05em (tracking-tighter);
color: white;
```
**Uso:** Títulos de página, headlines principales  
**Ejemplo:** "ENTER STUDIO"

#### Títulos Secundarios (H2)
```css
font-size: 1.125rem (18px);
font-weight: 900 (Black);
text-transform: uppercase;
font-style: italic;
letter-spacing: 0.05em (tracking-wider);
color: white;
```
**Uso:** Títulos de sección, nombres de etapas  
**Ejemplo:** "PRODUCTION NODE"

#### Labels y Metadatos
```css
font-size: 0.625rem (10px);
font-family: monospace;
font-weight: 700 (Bold);
text-transform: uppercase;
letter-spacing: 0.3em (tracking-widest);
color: rgb(100, 116, 139); /* slate-500 */
```
**Uso:** Labels de formularios, metadatos, timestamps  
**Ejemplo:** "STUDIO EMAIL" | "SECURE PRODUCTION GATEWAY"

#### Cuerpo de Texto
```css
font-size: 0.875rem (14px);
font-weight: 400-500 (Regular-Medium);
line-height: 1.6;
color: rgb(226, 232, 240); /* slate-200 */
```
**Uso:** Descripciones, párrafos, contenido general

### Reglas Tipográficas

✅ **Hacer:**
- Usar mayúsculas e itálicas para títulos impactantes
- Combinar sans-serif moderna con monospace para contraste
- Mantener alto contraste (blanco sobre oscuro)
- Usar tracking amplio en labels pequeños para legibilidad

❌ **Evitar:**
- Tipografías serif (excepto en casos muy específicos de branding)
- Más de 3 pesos tipográficos en una misma vista
- Texto gris claro sobre fondos claros (bajo contraste)
- Justificación de texto (siempre alineación izquierda o centrada)

---

## 4. Paleta de Color

### Colores Primarios

#### Negro Profundo (Background Base)
```css
--background-primary: #020205;
rgb(2, 2, 5)
```
**Uso:** Fondo principal de la aplicación, fondos de página  
**Sensación:** Sofisticación, enfoque, sala de cine

#### Blanco Puro (Texto Principal)
```css
--text-primary: #FFFFFF;
rgb(255, 255, 255)
```
**Uso:** Títulos, texto importante, iconos principales  
**Sensación:** Claridad, profesionalismo

#### Slate 200 (Texto Secundario)
```css
--text-secondary: rgb(226, 232, 240);
```
**Uso:** Cuerpo de texto, descripciones  
**Sensación:** Legibilidad sin agresividad

#### Slate 500 (Texto Terciario/Labels)
```css
--text-tertiary: rgb(100, 116, 139);
```
**Uso:** Labels, metadatos, placeholders  
**Sensación:** Información de soporte

### Colores de Acento

#### Indigo (Acción Principal)
```css
--primary-indigo: rgb(79, 70, 229); /* indigo-600 */
--primary-indigo-light: rgb(99, 102, 241); /* indigo-500 */
--primary-indigo-dark: rgb(67, 56, 202); /* indigo-700 */

/* Gradiente de marca */
background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
/* indigo-600 to violet-700 */
```
**Uso:** Botones primarios, CTAs, elementos interactivos principales  
**Sensación:** Creatividad, innovación, acción

#### Cyan (Acento Secundario)
```css
--accent-cyan: rgb(6, 182, 212); /* cyan-600 */
```
**Uso:** Acentos visuales, elementos decorativos, highlights  
**Sensación:** Frescura, modernidad, tecnología amigable

### Colores de Estado

#### Success (Verde)
```css
--success: rgb(34, 197, 94); /* green-500 */
--success-bg: rgba(34, 197, 94, 0.1);
```
**Uso:** Confirmaciones, estados completados

#### Warning (Amarillo)
```css
--warning: rgb(234, 179, 8); /* yellow-500 */
--warning-bg: rgba(234, 179, 8, 0.1);
```
**Uso:** Advertencias, estados pendientes

#### Error (Rojo)
```css
--error: rgb(239, 68, 68); /* red-500 */
--error-bg: rgba(239, 68, 68, 0.1);
```
**Uso:** Errores, estados fallidos

### Colores de Superficie

#### Superficie Elevada (Glassmorphism)
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(40px);
border: 1px solid rgba(255, 255, 255, 0.1);
```
**Uso:** Cards, modales, paneles elevados

#### Superficie Activa
```css
background: rgba(79, 70, 229, 0.03);
border: 1px solid rgba(79, 70, 229, 0.3);
box-shadow: 0 0 50px rgba(79, 70, 229, 0.1);
```
**Uso:** Elementos seleccionados, estados activos

### Gradientes de Marca

#### Gradiente Principal (Logo/CTAs)
```css
background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
```

#### Gradiente de Fondo Radial
```css
background: radial-gradient(
  circle at 50% 50%, 
  rgba(15, 15, 35, 1) 0%, 
  rgba(2, 2, 5, 1) 100%
);
```

#### Orbes de Luz (Elementos Decorativos)
```css
/* Orbe Indigo */
background: rgba(79, 70, 229, 0.05);
filter: blur(120px);

/* Orbe Cyan */
background: rgba(6, 182, 212, 0.05);
filter: blur(100px);
```

### Reglas de Uso de Color

✅ **Hacer:**
- Mantener alto contraste para accesibilidad (WCAG AA mínimo)
- Usar indigo para acciones primarias consistentemente
- Aplicar glassmorphism con moderación (solo en elementos elevados)
- Usar orbes de luz para crear profundidad ambiental

❌ **Evitar:**
- Colores saturados puros (siempre ajustar opacidad)
- Más de 2 colores de acento en una misma vista
- Fondos blancos o claros (rompe la identidad oscura)
- Gradientes excesivos o arcoíris

---

## 5. Logo y Símbolo

### Símbolo de Marca

**Icono:** Film/Claqueta  
**Forma:** Cuadrado redondeado (rounded-xl)  
**Fondo:** Gradiente indigo-violet  
**Tamaño estándar:** 48px × 48px

```jsx
<div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 
                rounded-xl flex items-center justify-center 
                shadow-[0_0_20px_rgba(79,70,229,0.3)]">
  <Film className="w-7 h-7 text-white" />
</div>
```

### Logotipo Textual

#### Versión Completa
```
AI FILM STUDIO
```
**Estilo:**
- Font: Sans-serif Black (900)
- Transform: Uppercase + Italic
- Tracking: Tighter (-0.05em)
- Color: White con "STUDIO" en indigo-400

#### Versión Corta (Aplicaciones pequeñas)
```
AI STUDIO
```

### Variaciones de Logo

#### Logo Principal (Horizontal)
```
[Icono] AI FILM STUDIO
```
**Uso:** Headers, landing pages, materiales de marketing

#### Logo Compacto (Vertical)
```
[Icono]
AI FILM
STUDIO
```
**Uso:** Favicons, apps móviles, espacios reducidos

#### Logo Monocromático
- Blanco sobre oscuro (uso principal)
- Oscuro sobre blanco (solo en casos excepcionales)

### Área de Protección

Mantener un espacio mínimo equivalente a la altura del icono alrededor del logo en todas las direcciones.

```
    [espacio]
[espacio] [LOGO] [espacio]
    [espacio]
```

### Tamaños Mínimos

- **Digital:** 120px de ancho mínimo
- **Impreso:** 25mm de ancho mínimo
- **Favicon:** 32px × 32px (solo icono)

---

## 6. Elementos Gráficos

### Glassmorphism (Efecto de Vidrio)

**Especificaciones:**
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

**Uso:**
- Cards de contenido
- Modales y diálogos
- Paneles de navegación
- Overlays

### Bordes Redondeados

**Sistema de Radios:**
```css
--radius-sm: 0.5rem (8px);   /* Botones pequeños, inputs */
--radius-md: 0.75rem (12px);  /* Botones estándar */
--radius-lg: 1rem (16px);     /* Cards pequeños */
--radius-xl: 1.5rem (24px);   /* Cards medianos */
--radius-2xl: 2rem (32px);    /* Secciones grandes */
--radius-3xl: 3rem (48px);    /* Elementos hero */
```

**Regla:** Elementos más grandes = bordes más redondeados

### Sombras

**Sistema de Elevación:**

```css
/* Sombra Sutil (Nivel 1) */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

/* Sombra Media (Nivel 2) */
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);

/* Sombra Profunda (Nivel 3) */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

/* Sombra con Glow (Elementos activos) */
box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);

/* Sombra con Glow Intenso (CTAs) */
box-shadow: 0 0 20px rgba(79, 70, 229, 0.3);
```

### Texturas y Overlays

#### Grain Overlay (Textura de Película)
```css
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  opacity: 0.03;
  background-image: url('carbon-fibre-pattern.png');
}
```
**Uso:** Overlay global para dar textura cinematográfica

#### Orbes de Luz (Ambient Glow)
```jsx
{/* Orbe decorativo */}
<div className="absolute top-1/4 right-0 w-[500px] h-[500px] 
                bg-indigo-600/5 rounded-full blur-[120px]" />
```
**Uso:** Fondos de secciones hero, páginas de login, landing pages

### Iconografía

**Estilo:** Lucide Icons (outline style)  
**Peso:** 2px stroke  
**Tamaños estándar:**
- Pequeño: 16px
- Medio: 20px
- Grande: 24px
- Extra grande: 32px

**Colores:**
- Primario: White
- Secundario: Slate-400
- Acento: Indigo-400

---

## 7. Voz y Tono

### Principios de Comunicación

#### 1. Humano, No Tecnológico

**Hacer:**
- "Tu visión, amplificada"
- "Crea la película que imaginas"
- "Tu asistente creativo"

**Evitar:**
- "Algoritmos de IA avanzados"
- "Machine learning de última generación"
- "Procesamiento neuronal"

#### 2. Inspirador, No Pretencioso

**Hacer:**
- "Cada gran historia comienza con una idea"
- "Dale vida a tu visión"
- "Crea sin límites"

**Evitar:**
- "Revoluciona la industria cinematográfica"
- "Sé el próximo Spielberg"
- "Contenido viral garantizado"

#### 3. Colaborativo, No Reemplazante

**Hacer:**
- "Trabajamos contigo"
- "Tu equipo creativo digital"
- "Amplificamos tu talento"

**Evitar:**
- "La IA hace todo por ti"
- "No necesitas equipo de producción"
- "Automatiza tu creatividad"

#### 4. Claro, No Complicado

**Hacer:**
- "Describe tu escena, obtén imágenes"
- "De idea a video en minutos"
- "Simple, pero profesional"

**Evitar:**
- "Pipeline de generación multi-modal"
- "Síntesis de video text-to-image"
- "Arquitectura de transformers"

### Tono por Contexto

| Contexto | Tono | Ejemplo |
|----------|------|---------|
| **Marketing** | Inspirador, aspiracional | "Donde tu visión encuentra su voz" |
| **Onboarding** | Amigable, guía | "Empecemos con tu primera escena" |
| **Tutoriales** | Claro, educativo | "Ajusta la intensidad de movimiento aquí" |
| **Errores** | Empático, solucionador | "Algo salió mal. Intentémoslo de nuevo" |
| **Éxito** | Celebratorio, motivador | "¡Tu escena está lista! ¿Qué sigue?" |

### Vocabulario de Marca

#### Palabras Preferidas
- Visión
- Creatividad
- Narrativa
- Cinematográfico
- Escena
- Historia
- Estética
- Colaborar
- Amplificar
- Crear

#### Palabras a Evitar
- Automatizar
- Algoritmo
- Procesamiento
- Generar (preferir "crear")
- Inteligencia artificial (usar "IA" si es necesario)
- Tecnología (a menos que sea absolutamente necesario)

### Ejemplos de Mensajes

#### Call to Action (CTA)
✅ "Crea tu primera escena"  
✅ "Empieza tu proyecto"  
✅ "Dale vida a tu idea"  
❌ "Generar contenido ahora"  
❌ "Activar IA"

#### Descripciones de Producto
✅ "AI Film Studio es tu asistente creativo para transformar ideas en imágenes cinematográficas."  
❌ "AI Film Studio usa algoritmos de machine learning para generar contenido audiovisual."

#### Mensajes de Error
✅ "No pudimos procesar tu escena. Revisa los detalles e inténtalo de nuevo."  
❌ "Error 500: Fallo en el pipeline de generación."

---

## 8. Aplicaciones

### Aplicación en Web

#### Header/Navegación
```jsx
<header className="h-[73px] bg-black/40 backdrop-blur-3xl 
                   border-b border-white/5">
  {/* Logo + Navegación */}
</header>
```

#### Botones

**Botón Primario:**
```jsx
<button className="bg-indigo-600 hover:bg-indigo-500 text-white 
                   rounded-xl h-14 px-8 font-bold 
                   shadow-[0_10px_30px_rgba(79,70,229,0.2)] 
                   transition-all active:scale-95">
  Crear Proyecto
</button>
```

**Botón Secundario:**
```jsx
<button className="bg-white/5 border border-white/10 text-white 
                   hover:bg-white/10 rounded-xl h-12 px-6">
  Cancelar
</button>
```

#### Cards
```jsx
<div className="bg-white/[0.02] border border-white/5 
                rounded-[2rem] p-8 backdrop-blur-xl">
  {/* Contenido */}
</div>
```

### Aplicación en Marketing

#### Email Marketing
- Fondo: Negro (#020205)
- Texto: Blanco/Slate-200
- CTAs: Botones indigo con sombra
- Imágenes: Screenshots de la app con glassmorphism

#### Redes Sociales
- **Instagram:** Formato 1:1, fondos oscuros con orbes de luz
- **LinkedIn:** Tono más profesional pero mantener humanidad
- **YouTube:** Thumbnails cinematográficos con títulos en mayúsculas itálicas

#### Presentaciones
- Fondo oscuro con orbes sutiles
- Tipografía grande y bold
- Máximo 3 colores por slide (negro, blanco, indigo)
- Imágenes a pantalla completa con overlays de texto

### Aplicación en Producto

#### Onboarding
- Fondo oscuro con gradiente radial
- Pasos numerados con iconos
- Texto claro y conciso
- CTAs indigo prominentes

#### Dashboard
- Layout espacioso con grid
- Cards con glassmorphism
- Jerarquía clara con tipografía
- Estados visuales claros (activo, completado, pendiente)

#### Modales/Diálogos
- Glassmorphism con blur intenso
- Bordes redondeados (2xl o 3xl)
- Sombras profundas
- Overlay oscuro semitransparente

---

## 9. Usos Prohibidos

### ❌ Prohibiciones Visuales

1. **No usar fondos blancos o claros**  
   La identidad es oscura y cinematográfica.

2. **No distorsionar el logo**  
   No estirar, rotar arbitrariamente, o cambiar proporciones.

3. **No usar colores no autorizados**  
   Especialmente: verde lima, rosa chicle, naranja brillante.

4. **No usar tipografías script o decorativas**  
   Mantener sans-serif moderna y monospace.

5. **No saturar con gradientes**  
   Máximo 1-2 gradientes por vista.

6. **No usar efectos 3D o skeumorfismo**  
   Mantener diseño flat con profundidad sutil.

### ❌ Prohibiciones de Comunicación

1. **No prometer "reemplazo de creativos"**  
   Somos asistentes, no reemplazos.

2. **No usar jerga técnica innecesaria**  
   Hablar el lenguaje de creativos, no de ingenieros.

3. **No hacer comparaciones negativas**  
   No atacar a competidores o métodos tradicionales.

4. **No usar tono corporativo frío**  
   Mantener calidez y humanidad.

5. **No exagerar capacidades**  
   Ser honestos sobre lo que la herramienta puede hacer.

### ⚠️ Casos Especiales (Requieren Aprobación)

- Uso del logo en productos de terceros
- Colaboraciones de marca
- Eventos y patrocinios
- Merchandising
- Variaciones de color del logo

---

## Contacto y Aprobaciones

Para consultas sobre el uso de la marca o solicitudes especiales:

**Brand Team**  
AI Film Studio  
brand@aifilmstudio.com

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Feb 2026 | Versión inicial del manual |

---

**Última actualización:** Febrero 2026  
**Próxima revisión:** Agosto 2026

---

*"La mejor marca es la que se siente, no la que se ve."*
