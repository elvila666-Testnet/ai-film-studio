# Mictlan Editor

Editor de vídeo de escritorio para el flujo Mictlan. Esta primera entrega implementa la **fase 1** del plan: proyecto, bins, importación de clips, miniaturas y metadatos.

## Requisitos

- Python 3.12+
- FFmpeg y ffprobe en `PATH`
- PySide6 (`python -m pip install -e '.[test]'`)

## Ejecutar

Desde el repositorio:

```bash
cd editor
python -m pip install -e '.[test]'
PYTHONPATH=src python -m mictlan_editor
```

En Windows se puede usar `python -m mictlan_editor` después de instalar el paquete.

## Flujo actual

1. Selecciona **Import media** y elige uno o varios vídeos/audio.
2. El editor inspecciona el archivo con `ffprobe` y genera una miniatura con FFmpeg.
3. Los clips se agrupan automáticamente en los bins `Footage` o `Audio`.
4. Selecciona un clip para ver resolución, duración, fps, codec y ruta.

Las siguientes fases están preparadas en la estructura del módulo para añadir visor, timeline, conform, VFX y exportación OTIO sin rehacer la base.
