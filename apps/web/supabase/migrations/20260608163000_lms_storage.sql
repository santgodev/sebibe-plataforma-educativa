-- Crear bucket de Storage para archivos multimedia de los cursos
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses_media', 'courses_media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Seguridad para courses_media
-- 1. Cualquiera puede leer archivos (porque los thumbnails y PDFs son públicos para los alumnos)
DROP POLICY IF EXISTS "Public Access for courses_media" ON storage.objects;
CREATE POLICY "Public Access for courses_media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'courses_media');

-- 2. Solo usuarios autenticados pueden subir archivos
DROP POLICY IF EXISTS "Auth users can upload courses_media" ON storage.objects;
CREATE POLICY "Auth users can upload courses_media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'courses_media' AND auth.role() = 'authenticated');

-- 3. Solo usuarios autenticados pueden actualizar/borrar archivos
DROP POLICY IF EXISTS "Auth users can update courses_media" ON storage.objects;
CREATE POLICY "Auth users can update courses_media" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'courses_media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth users can delete courses_media" ON storage.objects;
CREATE POLICY "Auth users can delete courses_media" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'courses_media' AND auth.role() = 'authenticated');
