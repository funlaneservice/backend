-- DropForeignKey
ALTER TABLE "travel_requests" DROP CONSTRAINT "travel_requests_approvedOptionId_fkey";

-- AddForeignKey
ALTER TABLE "travel_requests" ADD CONSTRAINT "travel_requests_approvedOptionId_fkey" FOREIGN KEY ("approvedOptionId") REFERENCES "quote_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
