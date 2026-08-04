-- Se retira la función de páginas y bases de datos del workspace: no se va a
-- utilizar. Con ella se van las bases de datos de archivos por proyecto
-- (ProjectDatabase), los favoritos (solo apuntaban a páginas) y el vínculo
-- "información vinculada" de las tareas (Issue.linkedPageId).
--
-- Es un borrado destructivo: el contenido de las páginas (incluido el estado
-- Yjs del editor colaborativo) y las filas de las bases de datos se pierden.

-- Issue: quita el vínculo a página
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_linkedPageId_fkey";
DROP INDEX "Issue_linkedPageId_idx";
ALTER TABLE "Issue" DROP COLUMN "linkedPageId";

-- Tablas, en orden de dependencia (las hijas primero)
DROP TABLE "ProjectDatabase";
DROP TABLE "Favorite";
DROP TABLE "PropertyValue";
DROP TABLE "DatabaseProperty";
DROP TABLE "Page";

-- Enums que solo usaban esas tablas
DROP TYPE "PageType";
DROP TYPE "PropertyType";
