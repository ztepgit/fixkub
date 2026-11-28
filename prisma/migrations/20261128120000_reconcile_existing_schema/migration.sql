-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- AlterEnum
ALTER TYPE "CancelReason" ADD VALUE 'UNCONTACTABLE';

-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'PENDING_PAYMENT';

-- AlterEnum
ALTER TYPE "QueueStatus" ADD VALUE 'ARCHIVED';

-- DropIndex
DROP INDEX "Queue_shopId_idx";

-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "transRef" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Queue" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deviceBrand" TEXT,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInWarranty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceCategory" TEXT,
ADD COLUMN     "warrantyArchivedAt" TIMESTAMP(3),
ADD COLUMN     "warrantyUntil" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "maxActiveJobs",
DROP COLUMN "plan",
DROP COLUMN "subscriptionEndsAt",
ADD COLUMN     "creatorIp" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planStatus" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "planType" "PlanType" NOT NULL DEFAULT 'FREE_TRIAL',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShopOwner" ADD COLUMN     "name" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousExpiresAt" TIMESTAMP(3),
    "newExpiresAt" TIMESTAMP(3) NOT NULL,
    "slipUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "promptpayId" TEXT,
    "accountName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselItem" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentTransactionId_key" ON "Receipt"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNo_key" ON "Receipt"("receiptNo");

-- CreateIndex
CREATE INDEX "Receipt_shopId_idx" ON "Receipt"("shopId");

-- CreateIndex
CREATE INDEX "Receipt_receiptNo_idx" ON "Receipt"("receiptNo");

-- CreateIndex
CREATE INDEX "CarouselItem_isActive_order_idx" ON "CarouselItem"("isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transRef_key" ON "PaymentTransaction"("transRef");

-- CreateIndex
CREATE INDEX "Queue_shopId_isDeleted_idx" ON "Queue"("shopId", "isDeleted");

-- CreateIndex
CREATE INDEX "Queue_shopId_createdAt_idx" ON "Queue"("shopId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Queue_shopId_status_updatedAt_idx" ON "Queue"("shopId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Queue_shopId_isInWarranty_warrantyUntil_idx" ON "Queue"("shopId", "isInWarranty", "warrantyUntil");

-- CreateIndex
CREATE INDEX "Queue_shopId_phoneNumber_idx" ON "Queue"("shopId", "phoneNumber");

-- CreateIndex
CREATE INDEX "Queue_shopId_customerName_idx" ON "Queue"("shopId", "customerName");

-- CreateIndex
CREATE INDEX "Queue_shopId_serviceCategory_idx" ON "Queue"("shopId", "serviceCategory");

-- CreateIndex
CREATE INDEX "Queue_shopId_deviceBrand_idx" ON "Queue"("shopId", "deviceBrand");

-- CreateIndex
CREATE INDEX "Queue_shopId_deviceModel_idx" ON "Queue"("shopId", "deviceModel");

-- CreateIndex
CREATE UNIQUE INDEX "Queue_shopId_jobRef_key" ON "Queue"("shopId", "jobRef");

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;