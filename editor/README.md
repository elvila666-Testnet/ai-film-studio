# Mictlan Editor

Editor de vídeo de escritorio para el flujo Mictlan. Las fases 1, 2 y 3 están implementadas: gestión de medios, reproducción, timecode y edición multipista no destructiva.

## Requisitos

- Python 3.12+
- FFmpeg y ffprobe en `PATH`
- PySide6 (`python -m pip install -e '.[test]'`)

## Ejecutar

```bash
cd editor
python -m pip install -e '.[test]'
PYTHONPATH=src python -m mictlan_editor
```

## Flujo de edición

Importa un clip y selecciónalo en el bin. En la barra de la timeline puedes usar `Add V1` o `Add A1` para colocarlo en una pista; los clips se apilan automáticamente al final de su pista. El playhead rojo se puede mover haciendo clic sobre un espacio vacío de la timeline y sigue la posición del visor.

Haz clic en un clip para seleccionarlo y arrástralo para moverlo. Arrastra sus bordes izquierdo o derecho para recortar sin alterar el archivo original. `Cut at playhead` divide el clip en dos segmentos independientes. `Delete` elimina el segmento seleccionado de la secuencia, sin borrar el medio del bin.

Para añadir una transición, selecciona el clip izquierdo y usa `Dissolve` o `Wipe`; la transición se dibuja en el corte con su duración de 500 ms. Usa `＋ Title` para crear una capa sobre V2 desde el playhead, escribe el texto y arrastra el bloque dorado para cambiar su posición. Los títulos y transiciones son datos no destructivos de la secuencia y no alteran los medios originales.

Los atajos de reproducción son `J` (fotograma atrás), `K` (pausa), `L` (reproducir), flechas izquierda/derecha (fotograma), `I` (In) y `O` (Out). En escritorios con PipeWire activo se puede habilitar la salida de audio con `MICTLAN_ENABLE_AUDIO=1`.

Las siguientes fases están preparadas para conform, VFX, servidor compartido y exportación OTIO.
