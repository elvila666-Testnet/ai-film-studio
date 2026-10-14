# Mictlan Editor — entregas

## Fase 1 — Base de medios (entregada en esta iteración)

- [x] Proyecto Python 3.12 + PySide6 aislado en `editor/`.
- [x] Bins Footage, Audio, VFX y Exports.
- [x] Importar clips desde el selector de archivos.
- [x] Leer duración, resolución, fps y codec usando `ffprobe`.
- [x] Crear miniaturas con FFmpeg y mostrar metadatos en el inspector.

## Próximas fases

- [ ] Visor con reproducción, timecode y controles J/K/L.
- [ ] Línea de tiempo multipista: cortar, recortar y mover.
- [ ] Conform desde EDL/XML y re-enlace de medios.
- [ ] Planos VFX con nombres, handles, versiones y exportación de plates.
- [ ] Servidor FastAPI + SQLite compartido con Mictlan web.
- [ ] Exportación EDL/XML/OTIO, render FFmpeg y color OpenColorIO.
