-- DropForeignKey
ALTER TABLE "annotations" DROP CONSTRAINT "annotations_label_class_id_fkey";

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_label_class_id_fkey" FOREIGN KEY ("label_class_id") REFERENCES "label_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
