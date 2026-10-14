# Mictlan Editor — entregas

## Fase 1 — Base de medios (entregada)

- [x] Proyecto Python 3.12 + PySide6 aislado en `editor/`.
- [x] Bins Footage, Audio, VFX y Exports.
- [x] Importar clips desde el selector de archivos.
- [x] Leer duración, resolución, fps y codec usando `ffprobe`.
- [x] Crear miniaturas con FFmpeg y mostrar metadatos en el inspector.

## Fase 2 — Visor y reproducción (entregada)

- [x] Visor de vídeo real con Qt Multimedia.
- [x] Timecode HH:MM:SS:FF sincronizado con el fps del clip.
- [x] Reproducir/pausar y avance o retroceso fotograma a fotograma.
- [x] Marcas In/Out y slider de timeline sincronizado.

## Fase 3 — Edición multipista (entregada)

- [x] Secuencia no destructiva con pistas V2, V1 y A1.
- [x] Añadir un clip del bin a la pista seleccionada y colocarlo al final de la pista.
- [x] Seleccionar clips visibles en la timeline y moverlos horizontalmente o entre pistas.
- [x] Cortar un clip en el playhead con `Cut at playhead`.
- [x] Recortar borde izquierdo o derecho arrastrando los handles del clip.
- [x] Eliminar el clip seleccionado con `Delete clip`.
- [x] Timeline y playhead sincronizados con el visor.

## Fase 4 — Transiciones y títulos (entregada)

- [x] Transiciones `Dissolve` y `Wipe` entre clips consecutivos.
- [x] Duración de transición representada en la secuencia y visible como bloque entre clips.
- [x] Capas de títulos editables sobre la pista V2.
- [x] Crear títulos desde la timeline con texto y duración inicial de 3 segundos.
- [x] Mover títulos arrastrándolos y eliminarlos desde la timeline.

## Fase 5 — Exportación y render final (entregada)

- [x] Exportar la secuencia como OTIO JSON con clips, recortes, pistas, transiciones y títulos.
- [x] Exportar EDL CMX 3600 con nombres de clip, archivos fuente y timecodes.
- [x] Exportar FCP XML compatible con herramientas de edición no lineal.
- [x] Renderizar MP4 H.264 con FFmpeg en formato de proyecto 1920×1080 16:9.
- [x] Mantener la proporción de los clips usando escala con letterbox, sin deformar la imagen.
- [x] Componer títulos sobre el vídeo durante el render final.

## Próximas fases

- [ ] Conform desde EDL/XML y re-enlace de medios.
- [ ] Planos VFX con nombres, handles, versiones y exportación de plates.
- [ ] Servidor FastAPI + SQLite compartido con Mictlan web.
- [ ] Color OpenColorIO.
