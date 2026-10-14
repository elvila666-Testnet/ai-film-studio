# Mictlan Editor

Editor de vídeo de escritorio para el flujo Mictlan. Las fases 1 y 2 están implementadas: gestión de medios, miniaturas, metadatos, reproducción y controles de transporte.

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

## Flujo actual

Selecciona **Import media** y elige uno o varios vídeos/audio. El editor inspecciona el archivo con `ffprobe`, genera una miniatura con FFmpeg y los agrupa automáticamente en `Footage` o `Audio`. Haz clic en el clip para cargarlo en el visor.

El visor ofrece play/pause, avance y retroceso fotograma a fotograma, slider de timeline, timecode SMPTE y marcas In/Out. Los atajos son `J` (fotograma atrás), `K` (pausa), `L` (reproducir), flechas izquierda/derecha (fotograma), `I` (In) y `O` (Out). En escritorios con PipeWire activo se puede habilitar la salida de audio con `MICTLAN_ENABLE_AUDIO=1`; el modo silencioso por defecto mantiene el visor estable en CI, contenedores y sandboxes sin dispositivo de audio.

Las siguientes fases están preparadas en la estructura del módulo para añadir edición multipista, conform, VFX, servidor compartido y exportación OTIO.
