-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "retryOfId" TEXT;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_retryOfId_fkey" FOREIGN KEY ("retryOfId") REFERENCES "Execution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
