# Mictlan Editor — entregas

## Fase 1 — Base de medios (entregada)

- [x] Proyecto Python 3.12 + PySide6 aislado en `editor/`.
- [x] Bins Footage, Audio, VFX y Exports.
- [x] Importar clips desde el selector de archivos.
- [x] Leer duración, resolución, fps y codec usando `ffprobe`.
- [x] Crear miniaturas con FFmpeg y mostrar metadatos en el inspector.

## Fase 2 — Visor y reproducción (entregada)

- [x] Visor de vídeo real con Qt Multimedia y salida de audio.
- [x] Timecode HH:MM:SS:FF sincronizado con el fps del clip.
- [x] Reproducir y pausar con el botón central o la tecla `L`.
- [x] Pausar con `K` y avanzar/retroceder fotograma a fotograma con `J`, flechas y los botones de transporte.
- [x] Marcas In/Out con botones y teclas `I`/`O`.
- [x] Slider de timeline sincronizado con la posición del reproductor.

## Próximas fases

- [ ] Línea de tiempo multipista: cortar, recortar y mover.
- [ ] Conform desde EDL/XML y re-enlace de medios.
- [ ] Planos VFX con nombres, handles, versiones y exportación de plates.
- [ ] Servidor FastAPI + SQLite compartido con Mictlan web.
- [ ] Exportación EDL/XML/OTIO, render FFmpeg y color OpenColorIO.
